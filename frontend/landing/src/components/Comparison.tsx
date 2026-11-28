import { Check, Minus } from 'lucide-react';
import Reveal from './Reveal';
import Brand from './Brand';

type Cell = { kind: 'yes' } | { kind: 'no' } | { kind: 'partial'; note: string };

const yes: Cell = { kind: 'yes' };
const no: Cell = { kind: 'no' };
const partial = (note: string): Cell => ({ kind: 'partial', note });

interface Row {
  feature: string;
  tradingBeast: Cell;
  manual: Cell;
  signalGroups: Cell;
}

const rows: Row[] = [
  {
    feature: 'Session-aware focus list (Asian / London / New York)',
    tradingBeast: yes,
    manual: no,
    signalGroups: no,
  },
  {
    feature: 'Transparent scoring — EMA, RSI, ADR & opening-range evidence shown',
    tradingBeast: yes,
    manual: partial('Possible, but chart by chart, by hand'),
    signalGroups: no,
  },
  {
    feature: 'Works inside Telegram — no new app to install',
    tradingBeast: yes,
    manual: no,
    signalGroups: partial('Chat messages only, no app'),
  },
  {
    feature: 'Pay per use with credits — browsing and the clock are free',
    tradingBeast: yes,
    manual: partial('Free, but it costs your time'),
    signalGroups: no,
  },
  {
    feature: 'No buy/sell signals or profit claims',
    tradingBeast: yes,
    manual: yes,
    signalGroups: no,
  },
  {
    feature: 'Personal watchlist, same account on phone and browser',
    tradingBeast: yes,
    manual: partial('Separate apps, notes & spreadsheets'),
    signalGroups: no,
  },
  {
    feature: 'Referral reward: 7 days of Pro free for both sides',
    tradingBeast: yes,
    manual: no,
    signalGroups: no,
  },
];

const columns: { key: keyof Omit<Row, 'feature'>; label: string; highlight?: boolean }[] = [
  { key: 'tradingBeast', label: 'TradingBeast', highlight: true },
  { key: 'manual', label: 'Manual chart-watching' },
  { key: 'signalGroups', label: 'Generic signal groups' },
];

function CellView({ cell, highlight }: { cell: Cell; highlight?: boolean }) {
  if (cell.kind === 'yes') {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full"
        style={{
          background: highlight ? 'var(--color-focus-bg)' : 'var(--color-surface-hover)',
          color: highlight ? 'var(--color-focus)' : 'var(--color-text-muted)',
        }}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (cell.kind === 'no') {
    return (
      <span className="inline-flex items-center justify-center">
        <Minus className="h-4 w-4" style={{ color: 'var(--color-text-faint)' }} aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col items-center gap-1">
      <Minus className="h-4 w-4" style={{ color: 'var(--color-watch)' }} aria-hidden="true" />
      <span
        className="max-w-[150px] text-[11px] leading-tight"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {cell.note}
      </span>
      <span className="sr-only">Partially</span>
    </span>
  );
}

export default function Comparison() {
  return (
    <section id="comparison" className="py-20 sm:py-24" aria-labelledby="comparison-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            Compare
          </p>
          <h2
            id="comparison-heading"
            className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            A calmer way to prepare.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            TradingBeast doesn&apos;t replace your judgement — it replaces the hours of scanning
            before it. Here is how it stacks up against the usual options.
          </p>
        </Reveal>

        <Reveal>
          <div
            className="mx-auto max-w-5xl overflow-x-auto rounded-[var(--radius-lg)] border"
            role="region"
            aria-label="Feature comparison table — scroll horizontally on small screens"
            tabIndex={0}
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <caption className="sr-only">
                Feature comparison between TradingBeast, manual chart-watching and generic
                signal groups
              </caption>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th scope="col" className="w-[38%] px-6 py-5 text-left font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    Feature
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="px-4 py-5 text-center align-bottom"
                      style={col.highlight ? { background: 'var(--color-accent-soft)' } : undefined}
                    >
                      {col.highlight ? (
                        <span className="inline-flex scale-[0.82]">
                          <Brand />
                        </span>
                      ) : (
                        <span className="font-semibold">{col.label}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.feature}
                    style={
                      i < rows.length - 1
                        ? { borderBottom: '1px solid var(--color-border)' }
                        : undefined
                    }
                  >
                    <th scope="row" className="px-6 py-4 text-left font-medium">
                      {row.feature}
                    </th>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-4 text-center align-middle"
                        style={col.highlight ? { background: 'var(--color-accent-soft)' } : undefined}
                      >
                        <CellView cell={row[col.key]} highlight={col.highlight} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <p
            className="mx-auto mt-8 max-w-2xl text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            You always make the final call. TradingBeast is an analysis tool — it shows you
            where to look and why, never what to buy or sell.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
