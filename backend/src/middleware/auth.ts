import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEffectiveTier } from '../services/entitlements.js';

import { prisma } from '../services/db.js';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32 || ['dev-secret-change-in-production','your-super-secret-jwt-key-change-in-production-min-32-chars'].includes(JWT_SECRET)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}
const signingSecret: string = JWT_SECRET;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    telegramId: string;
    tier: string;
  };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  let decoded: { userId: string; telegramId: string };
  try {
    const payload=jwt.verify(token, signingSecret,{algorithms:['HS256']});
    if(typeof payload==='string' || typeof payload.userId!=='string' || typeof payload.telegramId!=='string') throw new Error('Invalid claims');
    decoded={userId:payload.userId,telegramId:payload.telegramId};
  } catch { return res.status(401).json({success:false,error:'Invalid token'}); }
  try {
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.telegramId!==decoded.telegramId) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    req.user = { id: user.id, telegramId: user.telegramId, tier: await getEffectiveTier(user.id) };
    next();
  } catch(error) { next(error); }
}

export function generateToken(user: { id: string; telegramId: string; tier: string }): string {
  return jwt.sign({ userId: user.id, telegramId: user.telegramId, tier: user.tier }, signingSecret, { algorithm:'HS256', expiresIn: '30d' });
}

export function requireTier(...allowedTiers: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedTiers.includes(req.user.tier)) {
      return res.status(403).json({ success: false, error: 'Insufficient tier' });
    }
    next();
  };
}

// Operational admin identity is independent of paid membership.
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const ids = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
  if (!req.user || !ids.includes(req.user.telegramId)) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}
