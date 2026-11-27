import crypto from 'node:crypto';

export interface TelegramIdentity {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

export function verifyTelegramInitData(raw: string, token: string, now = Math.floor(Date.now()/1000)): TelegramIdentity | null {
  if (!token || !raw || raw.length > 16384) return null;
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  const date = Number(params.get('auth_date'));
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash) || !params.has('auth_date') || !Number.isSafeInteger(date) || date > now + 30 || now - date > 300 || new Set(params.keys()).size !== [...params.keys()].length) return null;
  params.delete('hash');
  const check = [...params.entries()].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => k + '=' + v).join('\n');
  const key = crypto.createHmac('sha256','WebAppData').update(token).digest();
  const expected = crypto.createHmac('sha256',key).update(check).digest();
  if (!crypto.timingSafeEqual(expected,Buffer.from(hash,'hex'))) return null;
  try {
    const user = JSON.parse(params.get('user') || '{}');
    if (!Number.isSafeInteger(user.id) || user.id <= 0) return null;
    for (const k of ['username','first_name','last_name','language_code']) if (user[k] !== undefined && typeof user[k] !== 'string') return null;
    return user;
  } catch { return null; }
}
