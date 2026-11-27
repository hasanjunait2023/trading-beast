import 'dotenv/config';
const token = process.env.TELEGRAM_BOT_TOKEN;
const rawUrl = process.env.TELEGRAM_MINI_APP_URL;
if (!token || !rawUrl) throw new Error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_MINI_APP_URL');
const url = new URL(rawUrl);
if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Mini App requires a valid HTTPS URL');
async function call(method, body) {
  try {
    const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error('Telegram API rejected request');
    return data.result;
  } catch {
    throw new Error(method + ' failed; check bot credentials, HTTPS URL and connectivity');
  }
}
await call('setChatMenuButton', {menu_button:{type:'web_app', text:'Open App', web_app:{url:url.href}}});
const menu = await call('getChatMenuButton', {});
if (menu.type !== 'web_app' || menu.text !== 'Open App' || new URL(menu.web_app?.url).href !== url.href) throw new Error('Menu verification failed');
console.log('Verified: default Telegram menu opens TradingBeast Mini App.');
