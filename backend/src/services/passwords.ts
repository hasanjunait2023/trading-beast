import bcrypt from 'bcryptjs';

// bcrypt cost 12. bcryptjs is pure JS, so the Alpine production image needs
// no native build step. Plaintext passwords are never stored, logged, or
// returned by any endpoint — only this hash is persisted (User.passwordHash).
export const BCRYPT_COST = 12;
export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// A real bcrypt hash of a random throwaway password, generated once at boot.
// passwordLogin compares against this when the account does not exist (or has
// no password set) so the response time does not reveal whether an email is
// registered (user-enumeration resistance).
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-' + Math.random().toString(36).slice(2), BCRYPT_COST);
