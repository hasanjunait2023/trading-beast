import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { creditBalance, withRadarCredits, InsufficientCredits, DuplicateTrigger } from '../services/credits.js';
import { getEffectiveTier } from '../services/entitlements.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router: Router = Router();

// Telegram webhook endpoint
router.post('/webhook', async (req, res) => {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const supplied = req.get('X-Telegram-Bot-Api-Secret-Token');
  if (!secret || !supplied || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) {
    return res.status(403).json({ ok: false });
  }
  try {
    const update = req.body;

    // Handle callback queries (inline keyboard buttons)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return res.json({ ok: true });
    }

    // Handle messages
    if (update.message) {
      await handleMessage(update.message);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(500).json({ ok: false });
  }
});

// Set webhook
router.post('/set-webhook', authMiddleware, requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL required' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret || !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) return res.status(503).json({ success: false, error: 'Webhook secret not configured' });
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, secret_token: secret, allowed_updates: ['message', 'callback_query'] })
    });
    const data = await response.json() as { ok: boolean; result?: any; description?: string };
    res.json({ success: data.ok, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to set webhook' });
  }
});

// Get webhook info
router.get('/webhook-info', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const data = await response.json() as { ok: boolean; result?: any; description?: string };
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get webhook info' });
  }
});

async function handleMessage(message: any) {
  if (message.chat?.type !== 'private' || !message.from?.id || message.from.is_bot) return;
  const chatId = message.chat.id;
  const text = message.text?.trim() || '';
  const userId = message.from.id.toString();

  // Find or create user
  let user = await prisma.user.findUnique({ where: { telegramId: userId } });

  if (!user) {
    // New user - extract referral code from /start
    let referralCode: string | null = null;
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1 && parts[1].startsWith('ref_')) {
        referralCode = parts[1].slice(4);
      }
    }

    const refCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    user = await prisma.user.create({
      data: {
        telegramId: userId,
        username: message.from.username,
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        languageCode: message.from.language_code || 'en',
        tier: 'FREE',
        referralCode: refCode,
        referredBy: referralCode
      }
    });


    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer) {
        await prisma.referral.create({
          data: { referrerId: referrer.id, referredId: user.id, status: 'PENDING' }
        });
      }
    }
  }

  // Update last active
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  user = { ...user, tier: await getEffectiveTier(user.id) };

  // Handle commands
  if (text === '/login') {
    const code=crypto.randomBytes(32).toString('hex');
    const digest=crypto.createHash('sha256').update(code).digest('hex');
    await prisma.loginCode.create({data:{digest,userId:user.id,expiresAt:new Date(Date.now()+5*60*1000)}});
    await sendMessage(chatId,'Your one-time browser login code (expires in 5 minutes). Never share it: <code>'+code+'</code>');
  } else if (text === '/app') {
    await sendOpenApp(chatId);
  } else if (text === '/start' || text === '/help' || text.startsWith('/start ')) {
    await sendWelcomeMessage(chatId, user);
  } else if (text === '/credits') {
    await sendMessage(chatId, 'Credit balance: '+await creditBalance(user.id)+' | Radar: 10 credits | Daily grant: 10');
  } else if (text === '/focus') {
    await sendFocusList(chatId, user, 'msg:'+chatId+':'+message.message_id);
  } else if (text === '/watchlist') {
    await sendWatchlistMessage(chatId, user);
  } else if (text.startsWith('/watchlist ')) {
    const pairs = text.slice(11).split(',').map((s: string) => s.trim().toUpperCase());
    await updateWatchlist(chatId, user, pairs);
  } else if (text === '/tier' || text === '/subscription') {
    await sendTierInfo(chatId, user);
  } else if (text === '/referral') {
    await sendReferralInfo(chatId, user);
  } else if (text === '/pay') {
    await sendMessage(chatId,'Premium credit packages are not available yet. Free users receive 10 credits daily.');
  } else {
    await sendMessage(chatId, 'Unknown command. Use /help to see available commands.');
  }
}

async function handleCallbackQuery(query: { message: { chat: { id: number } }; data: string; from: { id: number }; id: string }) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const userId = query.from.id.toString();

  const storedUser = await prisma.user.findUnique({ where: { telegramId: userId } });
  if (!storedUser) return;
  const user = { ...storedUser, tier: await getEffectiveTier(storedUser.id) };

  if (data === 'focus_now') {
    await sendFocusList(chatId, user, 'callback:'+query.id);
  } else if (data === 'my_watchlist') {
    await sendWatchlistMessage(chatId, user);
  } else if (data === 'my_tier') {
    await sendTierInfo(chatId, user);
  } else if (data === 'referral_info') {
    await sendReferralInfo(chatId, user);
  } else if (data === 'payment_options') {
    await sendMessage(chatId,'Premium credit packages are not available yet. Free users receive 10 credits daily.');
  }

  // Answer callback query
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: query.id })
  });
}

async function sendOpenApp(chatId: number) {
  const url=process.env.TELEGRAM_MINI_APP_URL;
  if (!url || !url.startsWith('https://')) { await sendMessage(chatId,'Mini App is not configured yet.'); return; }
  await sendMessage(chatId,'Open your TradingBeast workspace.',{inline_keyboard:[[{text:'Open App',web_app:{url}}]]});
}

async function sendWelcomeMessage(chatId: number, user: any) {
  const isTrialActive = user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
  const trialDaysLeft = isTrialActive ? Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  const text = `
🎯 <b>Session Focus Radar</b> — Market Analysis Tool

Welcome${user.firstName ? `, ${user.firstName}` : ''}! This tool provides session-aware trading focus lists for forex traders.

<b>Your Status:</b> ${user.tier} ${isTrialActive ? `(Pro Trial: ${trialDaysLeft} days left)` : ''}

<b>Available Commands:</b>
/app — Open TradingBeast
/credits — Check credit balance
/login — One-time browser login code
/focus — Run Radar (10 credits)
/watchlist — View your watchlist
/watchlist EUR/USD,GBP/JPY,Gold — Update watchlist
/tier — View subscription details
/referral — Your referral code & stats
/pay — Payment options

<b>Sessions:</b>
🌏 Asian (00:00-08:00 UTC)
🇬🇧 London (08:00-16:00 UTC)
🇺🇸 New York (13:00-21:00 UTC)

⚠️ <i>Disclaimer: This is a market analysis tool, not investment advice. Trading involves risk. Past performance does not guarantee future results.</i>
  `.trim();

  await sendMessage(chatId, text, {
    inline_keyboard: [
      ...(process.env.TELEGRAM_MINI_APP_URL?.startsWith('https://') ? [[{ text: 'Open App', web_app: { url: process.env.TELEGRAM_MINI_APP_URL } }]] : []),
      [{ text: '🎯 Run Radar · 10 credits', callback_data: 'focus_now' }],
      [{ text: '📋 My Watchlist', callback_data: 'my_watchlist' }, { text: '💎 My Tier', callback_data: 'my_tier' }],
      [{ text: '👥 Referral', callback_data: 'referral_info' }, { text: '💳 Upgrade', callback_data: 'payment_options' }]
    ]
  });
}

async function sendFocusList(chatId: number, user: any, key: string) {
  // Import analysis service
  const { runAnalysisForUser } = await import('../services/analysis.js');

  try {
    const result = await withRadarCredits(user.id,key,()=>runAnalysisForUser(user.id));
    const text = formatFocusResult(result, user.tier) + '\n\nCredits remaining: ' + await creditBalance(user.id);
    await sendMessage(chatId, text);
  } catch (error) {
    if (error instanceof InsufficientCredits) { await sendMessage(chatId,'You need 10 credits to run Radar. Daily credits accumulate automatically.'); return; }
    if (error instanceof DuplicateTrigger) return;
    console.error('Focus list error:', error);
    await sendMessage(chatId, '❌ Failed to generate focus list. Please try again later.');
  }
}

function formatFocusResult(result: any, tier: string): string {
  const isFree = tier === 'FREE';
  let text = `🎯 <b>${result.session.toUpperCase()} SESSION FOCUS</b>\n⏰ ${result.timestamp} BDT\n\n`;

  if (result.warnings.length) {
    text += `⚠️ ${result.warnings.join('\n⚠️ ')}\n\n`;
  }

  if (result.focus.length === 0) {
    text += 'No focus pairs meet criteria at this time. Check back later.';
    return text;
  }

  text += '<b>✅ FOCUS (Top 3)</b>\n';
  const medals = ['🥇', '🥈', '🥉'];
  result.focus.forEach((r: any, i: number) => {
    const label = r.kind === 'asset' ? `${r.icon} ${r.name}` : `${r.pair}`;
    const arrow = r.bias === 'BUY' ? '📈 BUY' : r.bias === 'SELL' ? '📉 SELL' : '➖';
    text += `${medals[i]} <b>${label}</b> ${arrow} — Score: ${r.score}/100\n`;
    if (!isFree) {
      text += `  4H: ${r.d4 >= 0 ? '+' : ''}${r.d4} | 1H: ${r.d1 >= 0 ? '+' : ''}${r.d1} | 15m: ${r.d15 >= 0 ? '+' : ''}${r.d15}\n`;
      text += `  ER: ${r.er.toFixed(2)} | RSI: ${r.rsi.toFixed(0)} | ADR: ${r.adrPct ?? '—'}%\n`;
      if (r.orConfirmed) text += `  ✅ OR Breakout confirmed\n`;
    }
  });

  if (result.watch.length && !isFree) {
    text += '\n<b>👀 WATCH</b>\n';
    result.watch.forEach((r: any) => {
      const label = r.kind === 'asset' ? `${r.icon} ${r.name}` : `${r.pair}`;
      const arrow = r.bias === 'BUY' ? '📈' : '📉';
      text += `${arrow} ${label} — ${r.score}/100 (setup forming)\n`;
    });
  }

  if (result.avoid.length && !isFree) {
    text += '\n<b>🚫 AVOID</b>\n';
    result.avoid.slice(0, 3).forEach((r: any) => {
      const label = r.kind === 'asset' ? `${r.icon} ${r.name}` : `${r.pair}`;
      text += `🔴 ${label} — ${r.score}/100\n`;
    });
  }

  if (isFree) {
    text += '\n🔒 <i>Upgrade to Pro for full analysis details, watch/avoid lists, and live alerts.</i>';
  }

  text += '\n\n⚠️ <i>Analysis tool only. Not investment advice. Trade at your own risk.</i>';
  return text;
}

async function sendWatchlistMessage(chatId: number, user: any) {
  const watchlist = user.watchlist?.length ? user.watchlist : ['EUR/USD', 'GBP/USD', 'USD/JPY', 'Gold', 'Bitcoin'];
  const text = `
📋 <b>Your Watchlist</b>

${watchlist.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

Use <code>/watchlist EUR/USD,GBP/JPY,Gold</code> to update.
  `.trim();
  await sendMessage(chatId, text);
}

async function updateWatchlist(chatId: number, user: any, pairs: string[]) {
  await prisma.user.update({
    where: { id: user.id },
    data: { watchlist: pairs }
  });
  await sendMessage(chatId, `✅ Watchlist updated: ${pairs.join(', ')}`);
}

async function sendTierInfo(chatId: number, user: any) {
  const isTrialActive = user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
  const trialDaysLeft = isTrialActive ? Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  const text = `
💎 <b>Your Subscription</b>

<b>Current Tier:</b> ${user.tier} ${isTrialActive ? `(Pro Trial — ${trialDaysLeft} days left)` : ''}

<b>Tier Benefits:</b>
🆓 <b>Free</b> — 3 focus pairs per session, delayed, basic info only
⭐ <b>Pro</b> — All pairs, live focus, watch/avoid lists, session alerts, full analysis
💎 <b>Elite</b> — Pro + custom alerts, priority support, API access

${isTrialActive ? `⏳ Trial expires in ${trialDaysLeft} days. Upgrade to keep Pro features.` : ''}
  `.trim();

  await sendMessage(chatId, text, {
    inline_keyboard: [
      [{ text: '💳 Upgrade to Pro', callback_data: 'payment_options' }],
      [{ text: '👥 Referral Program', callback_data: 'referral_info' }]
    ]
  });
}

async function sendReferralInfo(chatId: number, user: any) {
  const referrals = await prisma.referral.count({ where: { referrerId: user.id, status: 'CREDITED' } });
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'your_bot';
  const refLink = `https://t.me/${botUsername}?start=ref_${user.referralCode}`;

  const text = `
👥 <b>Referral Program</b>

<b>Your Code:</b> <code>${user.referralCode}</code>
<b>Referral Link:</b> ${refLink}
<b>Successful Referrals:</b> ${referrals}

<b>Rewards:</b>
• Each referral = 7 days free Pro for you
• Referred user gets 7 days free Pro
• No limit on referrals

Share your link with trading friends!
  `.trim();

  await sendMessage(chatId, text);
}

async function sendPaymentOptions(chatId: number, user: any) {
  const text = `
💳 <b>Upgrade to Pro</b>

<b>Monthly:</b> $9.99/month
<b>Yearly:</b> $99/year (save ~17%)

<b>Payment Methods:</b>
🇧🇩 bKash / Nagad — Manual verification
₿ USDT (TRC20) — Auto-verified
💳 Stripe (Card) — Coming soon

<b>Steps:</b>
1. Choose amount & method
2. Send payment
3. Upload screenshot (bKash/Nagad)
4. Admin verifies → Pro activated

Contact support for payment details.
  `.trim();

  await sendMessage(chatId, text);
}

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup ? JSON.stringify(replyMarkup) : undefined,
      disable_web_page_preview: true
    })
  });
}

export { router as telegramRoutes };