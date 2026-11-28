import { Globe2, Layers, Gauge, Coins } from 'lucide-react';

/**
 * Trust strip: product facts only — no testimonials, no user counts, no
 * invented statistics. Every figure here is verifiable in the product:
 *  - 3 sessions: the engine scores Asian, London and New York separately.
 *  - 32 instruments: the engine's catalog is 28 FX pairs (all crosses of
 *    EUR/GBP/AUD/NZD/USD/CAD/CHF/JPY) plus Gold, Silver, Oil and Bitcoin.
 *  - Scores are points out of 100, always shown with indicator evidence.
 *  - Credit facts match the live wallet rules (docs/CREDIT-FREEMIUM.md).
 */
const facts = [
  {
    icon: Globe2,
    value: '3 sessions',
    label: 'Asian, London & New York — each scored on its own opening range',
  },
  {
    icon: Layers,
    value: '32 instruments',
    label: '28 FX pairs plus Gold, Silver, Oil and Bitcoin in every scan',
  },
  {
    icon: Gauge,
    value: 'Scores /100',
    label: 'Every score shown with its EMA, RSI, ADR and opening-range evidence',
  },
  {
    icon: Coins,
    value: '10 free credits daily',
    label: 'Credits never expire, and one full Radar run costs 10 credits',
  },
];

export default function TrustStrip() {
  return (
    <section aria-label="Product facts" className="px-3 sm:px-5">
      <div className="mx-auto max-w-7xl py-10 sm:py-12">
        <dl className="tb-stagger grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.value} className="flex items-start gap-4">
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                  style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <dt className="sr-only">{f.label}</dt>
                  <dd
                    className="tb-font-display tnum text-xl font-bold tracking-tight"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {f.value}
                  </dd>
                  <dd
                    className="mt-1 text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {f.label}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
