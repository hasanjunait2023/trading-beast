import { registerUser } from '../services/users.js';
import { asyncRouter } from '../middleware/async-router.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import { getEffectiveTier } from '../services/entitlements.js';
import { verifyTelegramInitData } from '../services/telegram-auth.js';
import { passwordLogin as passwordLoginService, InvalidCredentialsError, normalizeEmail } from '../services/profile.js';

import { prisma } from '../services/db.js';
const router: Router = asyncRouter();

const telegramAuthSchema = z.object({
  initData: z.string().min(1).max(16384),
  telegramId: z.string().optional(),
  referralCode: z.string().optional()
});

router.post('/telegram', async (req, res) => {
  const parsed = telegramAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid payload', details: parsed.error.errors });
  }

  const { referralCode } = parsed.data;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return res.status(503).json({ success: false, error: 'Telegram authentication unavailable' });
  const identity = verifyTelegramInitData(parsed.data.initData, botToken);
  if (!identity || (parsed.data.telegramId && parsed.data.telegramId !== String(identity.id))) return res.status(401).json({ success: false, error: 'Invalid Telegram identity' });
  const telegramId = String(identity.id);
  const { username, first_name: firstName, last_name: lastName, language_code: languageCode } = identity;

  const user = await registerUser({telegramId,username,firstName,lastName,languageCode},referralCode);

  const tier = await getEffectiveTier(user.id);
  const token = await generateToken({ id: user.id, telegramId: user.telegramId, tier });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        tier,
        trialEndsAt: user.trialEndsAt,
        referralCode: user.referralCode,
        profileCompleted: user.profileCompletedAt !== null
      }
    }
  });
});

router.post('/code', async (req, res, next) => {
  try {
    const parsed = z.object({code:z.string().regex(/^[a-f0-9]{64}$/)}).safeParse(req.body);
    if(!parsed.success) return res.status(400).json({success:false,error:'Invalid code'});
    const digest=crypto.createHash('sha256').update(parsed.data.code).digest('hex');
    const now=new Date();
    const user=await prisma.$transaction(async tx=>{
      const claimed=await tx.loginCode.updateMany({where:{digest,usedAt:null,expiresAt:{gt:now}},data:{usedAt:now}});
      if(claimed.count!==1)return null;
      const record=await tx.loginCode.findUniqueOrThrow({where:{digest},include:{user:true}});
      return record.user;
    });
    if(!user)return res.status(401).json({success:false,error:'Invalid or expired code'});
    const tier=await getEffectiveTier(user.id);
    const token=generateToken({id:user.id,telegramId:user.telegramId,tier});
    res.json({success:true,data:{token,user:{id:user.id,telegramId:user.telegramId,username:user.username,firstName:user.firstName,tier,referralCode:user.referralCode,watchlist:user.watchlist,languageCode:user.languageCode,profileCompleted:user.profileCompletedAt!==null}}});
  } catch(e){next(e);}
});

// Email + password sign-in for the browser portal (onboarding chapter).
// Stricter than the global /api/auth limiter: 10 attempts per 15 minutes
// per (IP + email). Every credential failure returns the identical generic
// 401 — unknown email, no password set, and wrong password are
// indistinguishable (see services/profile.ts passwordLogin).
const passwordLoginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
    return (req.ip ?? 'unknown') + ':' + email;
  },
  message: { success: false, error: 'Too many requests' }
});

const passwordLoginSchema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(128)
});

router.post('/password-login', passwordLoginLimit, async (req, res, next) => {
  try {
    const parsed = passwordLoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: 'Invalid payload' });
    let user;
    try {
      user = await passwordLoginService(parsed.data.email, parsed.data.password);
    } catch (e) {
      if (e instanceof InvalidCredentialsError) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }
      throw e;
    }
    const tier = await getEffectiveTier(user.id);
    const token = await generateToken({ id: user.id, telegramId: user.telegramId, tier });
    res.json({ success: true, data: { token, user: { id: user.id, telegramId: user.telegramId, username: user.username, firstName: user.firstName, tier, referralCode: user.referralCode, watchlist: user.watchlist, languageCode: user.languageCode, profileCompleted: user.profileCompletedAt !== null } } });
  } catch (e) { next(e); }
});

router.post('/refresh', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const tier = await getEffectiveTier(user.id);
  const token = await generateToken({ id: user.id, telegramId: user.telegramId, tier },req.user.sessionId);
  res.json({ success: true, data: { token } });
});

router.post('/logout',authMiddleware,async(req:AuthRequest,res)=>{
  await prisma.authSession.updateMany({where:{id:req.user!.sessionId,userId:req.user!.id,revokedAt:null},data:{revokedAt:new Date()}});
  res.json({success:true});
});
router.post('/logout-all',authMiddleware,async(req:AuthRequest,res)=>{
  await prisma.authSession.updateMany({where:{userId:req.user!.id,revokedAt:null},data:{revokedAt:new Date()}});
  res.json({success:true});
});
export { router as authRoutes };