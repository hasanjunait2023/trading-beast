import { Sunrise, Landmark, Building2, Clock3 } from 'lucide-react';
import Reveal from './Reveal';

const sessions = [
  {
    name: 'Asian session',
    icon: Sunrise,
    centres: 'Tokyo · Sydney · Singapore',
    desc: 'The first liquidity of the FX week. Ranges form here — the Radar scores which pairs are setting up and which are still asleep.',
  },
  {
    name: 'London session',
    icon: Landmark,
    centres: 'London · Frankfurt',
    desc: 'The deepest liquidity window of the day. Opening-range behaviour matters most here, and the focus list reflects that.',
  },
  {
    name: 'New York session',
    icon: Building2,
    centres: 'New York · Chicago',
    desc: 'US data drives the afternoon. The Radar re-scores the list for New York conditions instead of reusing the London picture.',
  },
];

export default function Sessions() {
  return (
    <section
      id="sessions"
      className="py-20 sm:py-24"
      style={{ background: 'var(--color-accent-soft)' }}
      aria-labelledby="sessions-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            Session-aware
          </p>
          <h2
            id="sessions-heading"
            className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            Three sessions. One focus list.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            The market does not behave the same way all day. TradingBeast organises analysis
            around the three trading sessions, so the ranking you see matches the session you
            are actually trading.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-3">
          {sessions.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.name} delay={i * 90}>
                <article
                  className="h-full rounded-[var(--radius-lg)] border p-7 sm:p-8"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] text-white"
                    style={{ background: 'var(--grad-accent)' }}
                  >
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h3 className="mb-1 text-2xl font-semibold">{s.name}</h3>
                  <p
                    className="mb-4 text-sm font-medium"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {s.centres}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {s.desc}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120}>
          <div
            className="mx-auto mt-8 flex max-w-3xl flex-col items-start gap-4 rounded-[var(--radius-lg)] border p-6 sm:flex-row sm:items-center sm:p-7"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <span
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]"
              style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              <Clock3 className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text)' }}>The session clock</strong> shows
              which sessions are active right now, when the next one opens, and where sessions
              overlap — displayed in your timezone, in the Mini App and the web portal, so you
              always know where you are in the trading day.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
