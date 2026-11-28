import { randomUUID } from 'node:crypto';
import { describe, it, expect, afterEach, afterAll } from 'vitest';
import { prisma } from './db.js';
import { registerUser } from './users.js';
import { creditBalance, utcDay, CREDIT_EPOCH_DAY, DAILY_CREDITS, WELCOME_CREDITS } from './credits.js';
import { getProfile, completeProfile, passwordLogin, EmailTakenError, InvalidCredentialsError } from './profile.js';
import { verifyPassword } from './passwords.js';

const enabled = process.env.RUN_DB_INTEGRATION === '1';
const ids: string[] = [];

describe.skipIf(!enabled)('PostgreSQL onboarding invariants', () => {
  afterEach(async () => { await prisma.user.deleteMany({ where: { telegramId: { in: ids.splice(0) } } }); });
  afterAll(async () => { await prisma.$disconnect(); });

  async function create() {
    const telegramId = 'test-' + randomUUID();
    ids.push(telegramId);
    return registerUser({ telegramId });
  }
  const eligible = () => utcDay() >= CREDIT_EPOCH_DAY;

  it('grants exactly 100 welcome credits once at account creation, on top of the daily grant', async () => {
    const user = await create();
    expect(await creditBalance(user.id)).toBe(WELCOME_CREDITS + (eligible() ? DAILY_CREDITS : 0));
    const welcome = await prisma.creditEntry.findMany({ where: { userId: user.id, kind: 'WELCOME_GRANT' } });
    expect(welcome).toHaveLength(1);
    expect(welcome[0].delta).toBe(BigInt(WELCOME_CREDITS));
    expect(welcome[0].reference).toBe('welcome');
    // Ledger sum equals the wallet balance (credit-audit invariant).
    const sum = await prisma.creditEntry.aggregate({ where: { userId: user.id }, _sum: { delta: true } });
    expect(sum._sum.delta).toBe(BigInt(WELCOME_CREDITS + (eligible() ? DAILY_CREDITS : 0)));
  });

  it('does not re-grant on re-login / repeat registration', async () => {
    const user = await create();
    const again = await registerUser({ telegramId: user.telegramId });
    expect(again.id).toBe(user.id);
    expect(await creditBalance(user.id)).toBe(WELCOME_CREDITS + (eligible() ? DAILY_CREDITS : 0));
    expect(await prisma.creditEntry.count({ where: { userId: user.id, kind: 'WELCOME_GRANT' } })).toBe(1);
  });

  it('keeps daily accrual working on top of the welcome grant', async () => {
    const user = await create();
    const today = utcDay();
    // Rewind the wallet to yesterday's state: drop today's daily grant.
    await prisma.$transaction(async (tx) => {
      await tx.creditEntry.deleteMany({ where: { userId: user.id, reference: 'grant:' + today } });
      await tx.creditWallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: BigInt(DAILY_CREDITS) }, lastGrantDay: today - 1 }
      });
    });
    expect(await creditBalance(user.id)).toBe(WELCOME_CREDITS + DAILY_CREDITS);
    expect(await prisma.creditEntry.count({ where: { userId: user.id, reference: 'grant:' + today } })).toBe(1);
  });

  it('completes the profile: normalises email/phone, hashes the password, sets the flag', async () => {
    const user = await create();
    const profile = await completeProfile(user.id, { email: '  Person@Example.COM ', phone: '01712345678', password: 'supersecret1' });
    expect(profile).toMatchObject({ email: 'person@example.com', phone: '+8801712345678', profileCompleted: true, hasPassword: true });
    expect(profile.profileCompletedAt).toBeInstanceOf(Date);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(row.passwordHash).not.toContain('supersecret1');
    await expect(verifyPassword('supersecret1', row.passwordHash!)).resolves.toBe(true);
    const fetched = await getProfile(user.id);
    expect(fetched?.profileCompleted).toBe(true);
    expect(JSON.stringify(fetched)).not.toContain('passwordHash');
  }, 30_000);

  it('rejects an email owned by another account, but allows the owner to re-complete', async () => {
    const a = await create();
    const b = await create();
    await completeProfile(a.id, { email: 'shared@example.com', phone: '+8801712345678', password: 'password-a1' });
    await expect(completeProfile(b.id, { email: 'SHARED@example.com', phone: '+8801812345678', password: 'password-b1' }))
      .rejects.toBeInstanceOf(EmailTakenError);
    // Same account re-completing (password-reset path) succeeds.
    const again = await completeProfile(a.id, { email: 'shared@example.com', phone: '+8801712345678', password: 'new-password-2' });
    expect(again.profileCompleted).toBe(true);
    await expect(passwordLogin('shared@example.com', 'new-password-2')).resolves.toMatchObject({ id: a.id });
  }, 30_000);

  it('password login succeeds with the right password and fails generically otherwise', async () => {
    const user = await create();
    await completeProfile(user.id, { email: 'login@example.com', phone: '+8801912345678', password: 'my-password-9' });
    await expect(passwordLogin('Login@Example.com', 'my-password-9')).resolves.toMatchObject({ id: user.id });
    await expect(passwordLogin('login@example.com', 'wrong-password')).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(passwordLogin('nobody@example.com', 'my-password-9')).rejects.toBeInstanceOf(InvalidCredentialsError);
    const noPassword = await create();
    expect(noPassword.email).toBeNull();
    await expect(passwordLogin('login2@example.com', 'my-password-9')).rejects.toBeInstanceOf(InvalidCredentialsError);
  }, 30_000);
});
