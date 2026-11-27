import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { generateToken, AuthRequest, authMiddleware } from '../middleware/auth.js';
import crypto from 'crypto';
import { verifyTelegramInitData } from '../services/telegram-auth.js';

const prisma = new PrismaClient();
const router: Router = Router();

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

  let user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    // Generate unique referral code
    let refCode: string;
    let attempts = 0;
    do {
      refCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      attempts++;
    } while (await prisma.user.findUnique({ where: { referralCode: refCode } }) && attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ success: false, error: 'Could not generate referral code' });
    }

    // Determine trial end (7 days from now)
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user = await prisma.user.create({
      data: {
        telegramId,
        username,
        firstName,
        lastName,
        languageCode: languageCode || 'en',
        tier: 'FREE',
        trialEndsAt,
        referralCode: refCode,
        referredBy: referralCode || null
      }
    });

    // Create trial subscription
    await prisma.subscription.create({
      data: {
        userId: user.id,
        tier: 'PRO',
        status: 'TRIAL',
        expiresAt: trialEndsAt
      }
    });

    // Handle referral
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            status: 'PENDING'
          }
        });
      }
    }
  } else {
    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });
  }

  const token = generateToken({ id: user.id, telegramId: user.telegramId, tier: user.tier });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        tier: user.tier,
        trialEndsAt: user.trialEndsAt,
        referralCode: user.referralCode
      }
    }
  });
});

router.post('/refresh', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const token = generateToken({ id: user.id, telegramId: user.telegramId, tier: user.tier });
  res.json({ success: true, data: { token } });
});

export { router as authRoutes };