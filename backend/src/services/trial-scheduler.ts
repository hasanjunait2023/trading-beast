import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TrialUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  tier: string;
  trialEndsAt: Date | null;
  subscription?: {
    id: string;
    tier: string;
    status: string;
    expiresAt: Date;
  } | null;
}

async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return false;
    }
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json() as { ok: boolean };
    return data.ok === true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

async function checkExpiringTrials(): Promise<void> {
  console.log('[Trial Scheduler] Checking for expiring trials...');

  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find users with trials expiring in next 24 hours (notification window)
  const expiringSoon = await prisma.user.findMany({
    where: {
      trialEndsAt: {
        gte: now,
        lte: twentyFourHoursFromNow,
      },
      tier: 'FREE',
    },
    include: {
      subscriptions: {
        where: { status: 'TRIAL' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  for (const user of expiringSoon) {
    const hoursLeft = Math.ceil((user.trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60));

    const message = `⚠️ <b>Trial Expiring Soon</b>\n\n` +
      `Hi ${user.firstName || 'there'},\n\n` +
      `Your <b>7-day PRO trial</b> expires in <b>${hoursLeft} hour(s)</b>.\n\n` +
      `After expiry, you'll lose access to:\n` +
      `• Real-time market analysis\n` +
      `• Advanced trading signals\n` +
      `• Priority support\n\n` +
      `💡 <b>Upgrade now</b> to continue with PRO features.\n` +
      `Use /start in the bot to see payment options.`;

    await sendTelegramMessage(user.telegramId, message);
    console.log(`[Trial Scheduler] Sent expiry warning to ${user.telegramId} (${hoursLeft}h left)`);
  }

  // Find users whose trials have already expired (downgrade)
  const expired = await prisma.user.findMany({
    where: {
      trialEndsAt: {
        lt: now,
      },
      tier: 'FREE',
    },
    include: {
      subscriptions: {
        where: { status: 'TRIAL' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  for (const user of expired) {
    // Update subscription status to EXPIRED
    if (user.subscriptions[0]) {
      await prisma.subscription.update({
        where: { id: user.subscriptions[0].id },
        data: { status: 'EXPIRED' },
      });
    }

    const message = `❌ <b>Trial Expired</b>\n\n` +
      `Hi ${user.firstName || 'there'},\n\n` +
      `Your <b>7-day PRO trial</b> has ended.\n\n` +
      `Your account is now on the <b>FREE plan</b>:\n` +
      `• Basic market data only\n` +
      `• Limited signals\n` +
      `• Community support\n\n` +
      `💡 <b>Upgrade to PRO</b> to restore full access.\n` +
      `Use /start in the bot to see payment options.`;

    await sendTelegramMessage(user.telegramId, message);
    console.log(`[Trial Scheduler] Downgraded user ${user.telegramId} (trial expired)`);
  }

  console.log(`[Trial Scheduler] Check complete. ${expiringSoon.length} warnings sent, ${expired.length} downgraded.`);
}

// Run every hour
export function startTrialScheduler(): NodeJS.Timeout {
  console.log('[Trial Scheduler] Starting trial expiry checker (runs hourly)...');

  // Run immediately on startup
  checkExpiringTrials().catch(console.error);

  // Then run every hour
  return setInterval(() => {
    checkExpiringTrials().catch(console.error);
  }, 60 * 60 * 1000);
}