import { Check, Zap, Crown, ArrowRight, Clock, Send } from 'lucide-react';
import Reveal from './Reveal';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

interface Tier {
  name: string;
  icon: typeof Zap;
  /** Headline shown where a money price would normally go — never a currency figure. */
  headline: string;
  planned?: boolean;
  features: string[];
  cta: 'free' | 'waitlist';
}

const tiers: Tier[] = [
  {
    name: 'Free',
    headline: 'Free — live now',
    icon: Zap,
    features: [
      '100 welcome credits when you join — 10 full Radar runs',
      '10 credits per day, granted every UTC day',
      'Credits never expire — unused credits stack up',
      'One Radar run costs 10 credits',
      'A failed analysis is refunded automatically',
      'Session Focus Radar, watchlist & session clock',
      'Same wallet in Telegram, the Mini App & the browser',
    ],
    cta: 'free',
  },
  {
    name: 'Pro',
    headline: 'Coming soon',
    planned: true,
    icon: Zap,
    features: [
      'Everything in Free',
      'A larger monthly credit grant (details at launch)',
      'Advanced features as they are released',
    ],
    cta: 'waitlist',
  },
  {
    name: 'Elite',
    headline: 'Coming soon',
    planned: true,
    icon: Crown,
    features: [
      'Everything in Free',
      'The largest monthly credit grant (details at launch)',
      'First access to advanced tools as they ship',
    ],
    cta: 'waitlist',
  },
];

export default function Pricing() {
  const telegram = useTelegramLinks();

  return (
    <section
      id="pricing"
      className="py-20 sm:py-24"
      style={{ background: 'var(--color-accent-soft)' }}
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            Pricing
          </p>
          <h2
            id="pricing-heading"
            className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            Start free. Pay per scan, in credits.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            No subscription and no card. You get 10 free credits every day, and a Radar run
            costs 10 credits — only when you choose to run one. There are no automatic paid
            scans.
          </p>
        </Reveal>

        {/* Welcome-credit conversion banner: the 100-credit join grant is
            the fastest honest path to a first Radar run. */}
        <Reveal className="mx-auto mb-12 max-w-5xl">
          <div
            className="flex flex-col items-start gap-6 rounded-[var(--radius-lg)] p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between"
            style={{ background: 'var(--grad-hero)', boxShadow: 'var(--shadow-hero)' }}
          >
            <div className="max-w-2xl">
              <p className="tb-font-display tnum text-2xl font-bold tracking-tight sm:text-3xl">
                Join today and start with 100 welcome credits
              </p>
              <p className="mt-3 leading-relaxed" style={{ color: '#d7efe6' }}>
                That is 10 full Radar runs in your wallet from minute one — before your first
                daily grant of 10 free credits even lands. Open the bot, pick a session, and
                run your first scan.
              </p>
            </div>
            <a
              href={telegram.primaryHref}
              {...telegramLinkProps(telegram)}
              className="tb-press inline-flex min-h-[52px] flex-shrink-0 items-center gap-2 rounded-full bg-white px-7 text-base font-semibold"
              style={{ color: '#054333' }}
            >
              <Send className="h-5 w-5" aria-hidden="true" />
              {telegram.isTelegram ? 'Claim in Telegram' : 'Get started free'}
            </a>
          </div>
        </Reveal>

        <div className="mx-auto grid max-w-5xl gap-6 pt-4 md:grid-cols-3">
          {tiers.map((t, i) => {
            const Icon = t.icon;
            return (
              <Reveal key={t.name} delay={i * 90}>
                <article
                  className="tb-lift relative flex h-full flex-col rounded-[var(--radius-lg)] border p-8"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: t.planned ? 'var(--color-border)' : 'var(--color-accent)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {t.planned && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold"
                        style={{
                          background: 'var(--color-warning-bg)',
                          color: 'var(--color-warning)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Coming soon — not yet available
                      </span>
                    </div>
                  )}

                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
                      style={{
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="text-xl font-bold">{t.name}</h3>
                  </div>

                  <p
                    className="mb-6 text-2xl font-bold"
                    style={{ color: t.planned ? 'var(--color-text-muted)' : 'var(--color-accent)' }}
                  >
                    {t.headline}
                  </p>

                  <ul className="mb-8 flex-1 space-y-3">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check
                          className="mt-0.5 h-4 w-4 flex-shrink-0"
                          style={{ color: 'var(--color-success)' }}
                          aria-hidden="true"
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {t.cta === 'free' ? (
                    <a
                      href={telegram.primaryHref}
                      {...telegramLinkProps(telegram)}
                      className="tb-press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full text-center font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: 'var(--grad-accent)' }}
                    >
                      {telegram.isTelegram ? 'Open in Telegram' : 'Get started free'}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : telegram.botUrl ? (
                    <a
                      href={telegram.botUrl}
                      {...telegramLinkProps(telegram)}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border text-center font-semibold transition-colors hover:bg-[var(--color-surface-hover)]"
                      style={{ borderColor: 'var(--color-border-strong)' }}
                    >
                      Hear about it in Telegram
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="flex min-h-[48px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border text-center font-semibold"
                      style={{
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-faint)',
                      }}
                    >
                      Hear about it in Telegram
                    </span>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120}>
          <div
            className="mx-auto mt-12 max-w-3xl space-y-2 text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <p>
              Refer a trader and you both benefit: when someone joins with your referral link,
              you both receive 7 days of Pro free.
            </p>
            <p>
              Pro and Elite are coming soon and not yet activated — no paid plan can be
              purchased yet, and plan details will be confirmed at launch.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
