import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, BCRYPT_COST } from './passwords.js';

describe('password hashing', () => {
  it('hashes with bcrypt at the configured cost and verifies', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).toMatch(new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`));
    expect(hash).not.toContain('correct horse');
    await expect(verifyPassword('correct horse battery', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery');
    await expect(verifyPassword('correct horse batter', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('produces a different hash per call (random salt)', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    expect(a).not.toBe(b);
    await expect(verifyPassword('same-password', a)).resolves.toBe(true);
    await expect(verifyPassword('same-password', b)).resolves.toBe(true);
  });
});
