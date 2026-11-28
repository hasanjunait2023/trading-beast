import { Send, MousePointerClick, ListOrdered, ArrowUpRight, ShieldAlert } from 'lucide-react';
import Reveal from './Reveal';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

const steps = [
  {
    icon: Send,
    title: '1. Open the bot',
    desc: 'Start TradingBeast in Telegram. Your account and credit wallet are created automatically — starting with 100 welcome credits, plus 10 free credits every day. No password, no card.',
    img: '/img/app-home.webp',
    imgAlt:
      'TradingBeast Mini App home screen: current session status, credit balance and the Open Radar action',
  },
  {
    icon: MousePointerClick,
    title: '2. Confirm a Radar run',
    desc: 'Pick a session — Asian, London or New York — review the 10-credit cost and your balance, then confirm. Nothing is ever charged for browsing.',
    img: '/img/run-radar.webp',
    imgAlt:
      'Run Radar confirmation in the Mini App, showing the session, the 10-credit cost and the wallet balance before anything is charged',
  },
  {
    icon: ListOrdered,
    title: '3. Read the focus list',
    desc: 'Pairs come back ranked Focus, Watch or Avoid, each with a score in points out of 100, a Bullish / Bearish / Neutral bias, and the evidence behind it. Results are delivered in Telegram and visible in the Mini App and portal.',
    img: '/img/pair-detail.webp',
    imgAlt:
      'Pair detail screen: one instrument with its score out of 100, bias and the indicator evidence behind the score',
  },
];

/**
 * "How it works" — replaces the old Docs grid. Links point only at real
 * destinations: the Telegram bot (via the shared config helper) and in-page
 * sections. No invented documentation routes.
 */
export default function Docs() {
  const telegram = useTelegramLinks();

  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-20"
      style={{ background: 'var(--color-accent-soft)' }}
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            How the Radar works
          </p>
          <h2
            id="how-heading"
            className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            From open to focus list in three steps.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            Every score is backed by visible evidence — EMA alignment, RSI, ADR and the
            opening range. No black boxes, and no promises.
          </p>
        </Reveal>

        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={i * 90}>
                <article
                  className="tb-lift h-full overflow-hidden rounded-[var(--radius-lg)] border"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Real product screen for this step (top of the screen,
                      cropped by the frame — the full screen is in the
                      showcase section below). */}
                  <div
                    className="overflow-hidden border-b"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-accent-soft)' }}
                  >
                    <img
                      src={s.img}
                      alt={s.imgAlt}
                      width={560}
                      height={420}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover object-top"
                    />
                  </div>
                  <div className="p-7 sm:p-8">
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-white"
                    style={{ background: 'var(--grad-accent)' }}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {s.desc}
                  </p>
                  {i === 0 && telegram.botUrl && (
                    <a
                      href={telegram.botUrl}
                      {...telegramLinkProps(telegram)}
                      className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      Open the bot
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120}>
          <div
            className="mx-auto mt-12 flex max-w-3xl items-start gap-4 rounded-[var(--radius-lg)] border p-6 sm:p-7"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
            role="note"
          >
            <ShieldAlert
              className="mt-0.5 h-6 w-6 flex-shrink-0"
              style={{ color: 'var(--color-warning)' }}
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text)' }}>Disclaimer:</strong> TradingBeast
              is a market analysis and information tool only. It is not financial advice, it
              does not provide trade signals, and it guarantees no outcomes. Scores are points
              out of 100 — never success rates. Trading involves substantial risk of loss;
              always do your own research and make your own decisions.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
