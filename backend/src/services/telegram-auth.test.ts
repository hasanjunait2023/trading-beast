import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { verifyTelegramInitData } from './telegram-auth.js';
const token = 'test-token';
const now = 1700000000;
function signed(date = now, user = { id: 123, first_name: 'Test' }) {
  const p = new URLSearchParams({ auth_date: String(date), user: JSON.stringify(user) });
  const check = [...p.entries()].sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => k+'='+v).join('\n');
  const key = crypto.createHmac('sha256','WebAppData').update(token).digest();
  p.set('hash',crypto.createHmac('sha256',key).update(check).digest('hex'));
  return p;
}
describe('Telegram signed identity', () => {
  it('accepts valid signed user', () => expect(verifyTelegramInitData(signed().toString(),token,now)?.id).toBe(123));
  it('rejects modified identity', () => { const p=signed(); p.set('user',JSON.stringify({id:456})); expect(verifyTelegramInitData(p.toString(),token,now)).toBeNull(); });
  it('rejects expired and future data', () => { for(const d of [now-301,now+31]) expect(verifyTelegramInitData(signed(d).toString(),token,now)).toBeNull(); });
  it('rejects duplicate fields', () => { const p=signed(); p.append('auth_date',String(now)); expect(verifyTelegramInitData(p.toString(),token,now)).toBeNull(); });
  it('rejects wrong token and missing hash', () => { expect(verifyTelegramInitData(signed().toString(),'wrong',now)).toBeNull(); const p=signed(); p.delete('hash'); expect(verifyTelegramInitData(p.toString(),token,now)).toBeNull(); });
});
