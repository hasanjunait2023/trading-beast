import { Prisma } from '@prisma/client';
import { prisma } from './db.js';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from './passwords.js';

// --- Validation / normalisation (pure; unit-tested in profile.test.ts) ---

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

// Accepts international E.164 ('+8801712345678', '+14155552671') and the two
// common Bangladeshi local spellings ('01712345678', '8801712345678'), which
// are normalised to E.164. Anything else is rejected.
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-()]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^8801[3-9]\d{8}$/.test(compact)) return '+' + compact;
  if (/^01[3-9]\d{8}$/.test(compact)) return '+880' + compact.slice(1);
  return null;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

// --- Profile shape returned by the API (hash is NEVER included) ---

export interface PublicProfile {
  email: string | null;
  phone: string | null;
  profileCompleted: boolean;
  profileCompletedAt: Date | null;
  hasPassword: boolean;
}

interface ProfileRow {
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  profileCompletedAt: Date | null;
}

export function toPublicProfile(row: ProfileRow): PublicProfile {
  return {
    email: row.email,
    phone: row.phone,
    profileCompleted: row.profileCompletedAt !== null,
    profileCompletedAt: row.profileCompletedAt,
    hasPassword: row.passwordHash !== null
  };
}

export async function getProfile(userId: string): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, passwordHash: true, profileCompletedAt: true }
  });
  return user ? toPublicProfile(user) : null;
}

export class EmailTakenError extends Error {}
export class ProfileNotFoundError extends Error {}

// Completes (or re-completes) the onboarding profile for the account owner.
// Re-completion is the password-reset path: the user re-enters via Telegram,
// then sets a new email/phone/password here. An email owned by a DIFFERENT
// account conflicts, enforced both by this check and the DB unique index.
export async function completeProfile(
  userId: string,
  input: { email: string; phone: string; password: string }
): Promise<PublicProfile> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (phone === null) throw new Error('Invalid phone number');
  const owner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (owner && owner.id !== userId) throw new EmailTakenError('Email already registered to another account');
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { email, phone, passwordHash, profileCompletedAt: new Date() },
      select: { email: true, phone: true, passwordHash: true, profileCompletedAt: true }
    });
    return toPublicProfile(user);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new EmailTakenError('Email already registered to another account');
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      throw new ProfileNotFoundError('User not found');
    }
    throw e;
  }
}

export class InvalidCredentialsError extends Error {}

// Email + password sign-in for the browser portal. Every failure mode —
// unknown email, account without a password, wrong password — throws the
// same InvalidCredentialsError, and a bcrypt compare runs in all paths so
// timing does not distinguish them.
export async function passwordLogin(emailRaw: string, password: string) {
  const email = normalizeEmail(emailRaw);
  const user = await prisma.user.findUnique({ where: { email } });
  const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(password, hash);
  if (!user || !user.passwordHash || !ok) throw new InvalidCredentialsError('Invalid email or password');
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  return user;
}
