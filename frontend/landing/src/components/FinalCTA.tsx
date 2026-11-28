import { ArrowRight, LogIn, Send } from 'lucide-react';
import Reveal from './Reveal';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
/** Optional build-time URL of the user portal (its /login route is linked). */
const PORTAL_URL = env.VITE_PORTAL_URL?.replace(/\/+$/, '') || null;

export default function FinalCTA() {
  const telegram = useTelegramLinks();

  // Portal login: explicit portal URL when configured, else the Mini App
  // (which signs in with Telegram), else the pricing anchor — never a dead link.
  const portalLoginHref = PORTAL_URL ? `${PORTAL_URL}/login` : (telegram.miniAppUrl ?? '#pricing');
  const portalIsExternal = Boolean(PORTAL_URL || telegram.miniAppUrl);

  return (
    <section id="get-started" className="px-3 pb-20 sm:px-5 sm:pb-24" aria-labelledby="cta-heading">
      <div
        className="mx-auto max-w-7xl rounded-[28px] px-6 py-16 text-center text-white sm:px-10 sm:py-20"
        style={{ background: 'var(--grad-hero)' }}
      >
        <Reveal>
          <p
            className="mb-4 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: '#c9f2e2' }}
          >
            Start free
          </p>
          <h2
            id="cta-heading"
            className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            The next session open is coming. Be ready for it.
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed" style={{ color: '#d7efe6' }}>
            Open TradingBeast in Telegram and run your first Radar with today&apos;s 10 free
            credits. No card, no password — and credits you don&apos;t use never expire.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={telegram.primaryHref}
              {...telegramLinkProps(telegram)}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white px-8 font-semibold transition-transform hover:-translate-y-0.5 sm:w-auto"
              style={{ color: '#054333' }}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {telegram.isTelegram ? 'Open in Telegram' : 'Get started free'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href={portalLoginHref}
              {...(portalIsExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-8 font-semibold text-white sm:w-auto"
              style={{ border: '1px solid rgba(255,255,255,0.45)' }}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Log in to the web portal
            </a>
          </div>

          <p className="mx-auto mt-10 max-w-xl text-sm" style={{ color: '#a9d8c6' }}>
            TradingBeast is a market analysis tool only — not financial advice. Trading
            involves substantial risk of loss.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
