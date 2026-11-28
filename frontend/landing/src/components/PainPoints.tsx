import { Eye, Hourglass, MessagesSquare, Wrench, ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

const pains = [
  {
    icon: Eye,
    title: 'Dozens of pairs, 3 sessions, one pair of eyes',
    pain: 'Serious moves can start in any session — Asian, London or New York. Watching every pair on every chart, all day, is not a strategy. It is exhaustion.',
    fix: 'TradingBeast scans the pair list for the session and ranks what deserves your attention.',
  },
  {
    icon: Hourglass,
    title: 'Analysis paralysis at the open',
    pain: 'The session opens, you start flipping through charts — and by the time you finish scanning, the opening move you were preparing for is already gone.',
    fix: 'One ranked focus list when you run the Radar, so preparation takes minutes, not the whole open.',
  },
  {
    icon: MessagesSquare,
    title: 'Noisy paid signal groups',
    pain: 'Screenshots, hype and “guaranteed” calls — with no reasoning you can check. When a call goes wrong, there is no score, no method and no accountability.',
    fix: 'No signals here. Every score shows the EMA, RSI, ADR and opening-range evidence behind it, so you can judge it yourself.',
  },
  {
    icon: Wrench,
    title: 'Tools scattered everywhere',
    pain: 'Charts in one app, a watchlist in a spreadsheet, notes somewhere else. Your trading workflow lives in five places — and none of them talk to each other.',
    fix: 'Focus list, watchlist and credits in one place — inside Telegram and in your browser, on the same account.',
  },
];

export default function PainPoints() {
  return (
    <section id="pain-points" className="py-16 sm:py-20" aria-labelledby="pain-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            The problem
          </p>
          <h2
            id="pain-heading"
            className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            Trading is hard enough. Preparation shouldn&apos;t be.
          </h2>
          <p
            className="mx-auto mt-4 max-w-2xl"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Most traders don&apos;t lose because they can&apos;t read a chart. They lose time —
            and focus — long before the trade.
          </p>
        </Reveal>

        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          {pains.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={(i % 2) * 90}>
                <article
                  className="h-full rounded-[var(--radius-lg)] border p-7 sm:p-8"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)]"
                    style={{ background: 'var(--color-avoid-bg)', color: 'var(--color-avoid)' }}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
                  <p
                    className="mb-5 text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {item.pain}
                  </p>
                  <p
                    className="flex items-start gap-2 border-t pt-4 text-sm leading-relaxed"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <ArrowRight
                      className="mt-0.5 h-4 w-4 flex-shrink-0"
                      style={{ color: 'var(--color-accent)' }}
                      aria-hidden="true"
                    />
                    <span>{item.fix}</span>
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
