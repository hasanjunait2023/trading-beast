import { Radar, Coins, Gauge } from 'lucide-react';
import Reveal from './Reveal';

/**
 * Showcase of the REAL product interface. Every image is an unmodified
 * design-package screen study of the TradingBeast app (values inside the
 * screens are the design's own; nothing was redrawn or invented here, and
 * nothing is presented as live market data).
 */
const shots = [
  {
    src: '/img/run-radar.webp',
    alt: 'Run Radar confirmation screen: selected session, scan cost in credits and balance before confirming',
    title: 'You confirm every run',
    desc: 'A Radar run only starts when you confirm it — the screen shows the session, the 10-credit cost and your balance first. Browsing is always free.',
    icon: Radar,
    w: 520,
    h: 558,
  },
  {
    src: '/img/credits.webp',
    alt: 'Credits screen: wallet balance, the daily grant and the cost of one Radar run',
    title: 'One wallet, everywhere',
    desc: 'Your credit balance, the daily grant and the scan cost — the same wallet in the bot, the Mini App and the browser portal.',
    icon: Coins,
    w: 520,
    h: 558,
  },
  {
    src: '/img/pair-detail.webp',
    alt: 'Pair detail screen: score in points out of 100, bias, and indicator evidence for one pair',
    title: 'Evidence, not just a number',
    desc: 'Open any pair to see its score, its bias, and the indicator evidence behind the ranking — including how fresh the data is.',
    icon: Gauge,
    w: 520,
    h: 607,
  },
];

export default function AppShowcase() {
  return (
    <section
      id="showcase"
      className="overflow-hidden py-20 sm:py-24"
      style={{ background: 'var(--color-accent-soft)' }}
      aria-labelledby="showcase-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            The real product
          </p>
          <h2
            id="showcase-heading"
            className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            This is the app you will actually use.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            No drawn mock-ups and no invented dashboards — these are TradingBeast&apos;s own
            product screens, in Telegram and on desktop.
          </p>
        </Reveal>

        <Reveal>
          <figure className="browser-frame mx-auto max-w-5xl">
            <div className="browser-frame-bar" aria-hidden="true">
              <span className="h-3 w-3 rounded-full" style={{ background: '#e5b4b8' }} />
              <span className="h-3 w-3 rounded-full" style={{ background: '#fbefc0' }} />
              <span className="h-3 w-3 rounded-full" style={{ background: '#cdeee0' }} />
              <span
                className="ml-3 text-xs font-medium"
                style={{ color: 'var(--color-text-muted)' }}
              >
                TradingBeast web portal — Markets / Radar
              </span>
            </div>
            <img
              src="/img/desktop-radar.webp"
              alt="TradingBeast desktop Radar: session selector, ranked pair table with Focus, Watch and Avoid status, scores and bias, with the session clock and watchlist alongside"
              width={1200}
              height={750}
              loading="lazy"
            />
          </figure>
        </Reveal>

        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-6">
          {shots.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.src} delay={i * 100}>
                <figure className="mx-auto max-w-[280px]">
                  <div className="phone-frame">
                    <img src={s.src} alt={s.alt} width={s.w} height={s.h} loading="lazy" />
                  </div>
                  <figcaption className="mt-5 text-center">
                    <span
                      className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
                      style={{
                        background: 'var(--color-surface)',
                        color: 'var(--color-accent)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    <p
                      className="mt-1 text-sm leading-relaxed"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {s.desc}
                    </p>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
