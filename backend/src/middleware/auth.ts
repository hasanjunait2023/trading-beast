import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

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
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; telegramId: string; tier: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    req.user = { id: user.id, telegramId: user.telegramId, tier: user.tier };
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

export function generateToken(user: { id: string; telegramId: string; tier: string }): string {
  return jwt.sign({ userId: user.id, telegramId: user.telegramId, tier: user.tier }, JWT_SECRET, { expiresIn: '30d' });
}

export function requireTier(...allowedTiers: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedTiers.includes(req.user.tier)) {
      return res.status(403).json({ success: false, error: 'Insufficient tier' });
    }
    next();
  };
}