import React from 'react';
import type { Bias, MarketStatus } from '../design-tokens';
import { StatusPill } from './StatusPill';
import { BiasText } from './Bias';

export interface RankRow {
  pair: string;
  status: MarketStatus;
  bias?: Bias;
  /** Score in points out of 100; omit for unranked/unavailable rows. */
  score?: number;
}

export interface RankTableProps {
  rows: RankRow[];
  onRowSelect?: (row: RankRow) => void;
  caption?: string;
}

/**
 * Desktop radar table (Instrument / Status / Bias / Score).
 * Rows are keyboard navigable: Tab reaches the table, arrow keys move
 * between rows, Enter/Space selects when onRowSelect is provided.
 */
export function RankTable({ rows, onRowSelect, caption }: RankTableProps) {
  const rowRefs = React.useRef<Array<HTMLTableRowElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next =
        e.key === 'ArrowDown'
          ? Math.min(index + 1, rows.length - 1)
          : Math.max(index - 1, 0);
      rowRefs.current[next]?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && onRowSelect) {
      e.preventDefault();
      onRowSelect(rows[index]);
    }
  };

  return (
    <div
      className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]"
      role="region"
      aria-label={caption ? `${caption} — scroll horizontally on small screens` : 'Radar results table — scroll horizontally on small screens'}
      tabIndex={0}
    >
      <table className="w-full border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-[var(--color-surface-elevated)] text-[13px] text-[var(--color-text-muted)]">
            <th scope="col" className="px-4 py-3 font-semibold">Instrument</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="px-4 py-3 font-semibold">Bias</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.pair}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              tabIndex={0}
              onClick={onRowSelect ? () => onRowSelect(row) : undefined}
              onKeyDown={(e) => handleKeyDown(e, i)}
              aria-label={onRowSelect ? `Open ${row.pair}` : undefined}
              className={`border-t border-[var(--color-border)] text-[15px] ${
                onRowSelect ? 'cursor-pointer hover:bg-[var(--color-surface-hover)]' : ''
              }`}
            >
              <td className="px-4 py-3 font-bold text-[var(--color-text)]">{row.pair}</td>
              <td className="px-4 py-3">
                <StatusPill status={row.status} />
              </td>
              <td className="px-4 py-3">
                {row.bias ? (
                  <BiasText bias={row.bias} />
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                )}
              </td>
              <td className="tnum px-4 py-3 text-right font-bold text-[var(--color-text)]">
                {typeof row.score === 'number' ? (
                  <>
                    {row.score}
                    <span className="ml-1 text-xs font-medium text-[var(--color-text-muted)]">
                      / 100
                    </span>
                  </>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
