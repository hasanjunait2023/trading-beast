import { motion } from 'framer-motion';
import { ArrowRight, LogIn, Send } from 'lucide-react';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
/** Optional build-time URL of the user portal (its /login route is linked). */
const PORTAL_URL = env.VITE_PORTAL_URL?.replace(/\/+$/, '') || null;

export default function FinalCTA() {
  const telegram = useTelegramLinks();

  // Portal login: explicit portal URL when configured, else the Mini App
  // (which signs in with Telegram), else the pricing anchor — never a dead link.
  const portalLoginHref = PORTAL_URL
    ? `${PORTAL_URL}/login`
    : telegram.miniAppUrl ?? '#pricing';
  const portalIsExternal = Boolean(PORTAL_URL || telegram.miniAppUrl);

  return (
    <section id="get-started" className="relative py-28 bg-[#060918] overflow-hidden">
      {/* Soft gradient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[320px] bg-gradient-to-r from-blue-600/15 via-violet-600/15 to-blue-600/15 blur-3xl rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <motion.div
        className="relative max-w-3xl mx-auto px-6 text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-4">Start Free</p>
        <h2 className="font-space font-bold text-4xl md:text-5xl text-white leading-tight">
          The next session open is coming.
          <span className="block bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            Be ready for it.
          </span>
        </h2>
        <p className="mt-5 text-gray-400 max-w-xl mx-auto leading-relaxed">
          Open TradingBeast in Telegram and run your first Radar today — free,
          with the 10 credits you already get every day. No card, no password.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={telegram.primaryHref}
            {...telegramLinkProps(telegram)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold py-3.5 px-8 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_24px_rgba(79,109,255,0.4)] hover:from-blue-500 hover:to-violet-500 transition-all"
          >
            <Send className="w-4 h-4" />
            {telegram.isTelegram ? 'Open in Telegram' : 'Get Started Free'}
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={portalLoginHref}
            {...(portalIsExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-semibold py-3.5 px-8 rounded-full bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all"
          >
            <LogIn className="w-4 h-4" />
            Log in to the web portal
          </a>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          ⚠️ TradingBeast is a market analysis tool only — not investment advice.
          Trading involves substantial risk of loss.
        </p>
      </motion.div>
    </section>
  );
}
