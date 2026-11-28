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
  /** Catalog pair the scan did not rank — reference variant renders the
   *  grey "UNRANKED" pill (unranked ≠ unavailable, handoff §3 row 04). */
  unranked?: boolean;
}

export interface RankTableProps {
  rows: RankRow[];
  onRowSelect?: (row: RankRow) => void;
  caption?: string;
  /** 'reference' = study-28 desktop table: mint header band, tall rows,
   *  flag-pair instrument cells, rectangular status pills, plain coloured
   *  bias text and a large bare score. Default keeps the Z1 table. */
  variant?: 'default' | 'reference';
  /** Reference variant: leading visual per row (e.g. <PairFlags />). */
  leading?: (row: RankRow) => React.ReactNode;
}

/** Study-28 status pill: rectangular, centred, uppercase. Colours come
 *  from the semantic status tokens (Focus mint, Watch warm yellow,
 *  Avoid burgundy, Unavailable/Unranked grey). */
const REF_PILL: Record<MarketStatus, string> = {
  focus: 'bg-[var(--color-focus-bg)] text-[var(--color-focus-text)]',
  watch: 'bg-[var(--color-watch-bg)] text-[var(--color-watch-text)]',
  avoid: 'bg-[var(--color-avoid-bg)] text-[var(--color-avoid-text)]',
  unavailable: 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]',
};

function ReferencePill({ row }: { row: RankRow }) {
  if (row.unranked) {
    return (
      <span className="inline-flex h-9 min-w-[100px] items-center justify-center rounded-[8px] bg-[var(--color-unavailable-bg)] px-2.5 text-[12px] font-extrabold tracking-wider text-[var(--color-unavailable-text)]">
        UNRANKED
      </span>
    );
  }
  return (
    <span
      className={`inline-flex h-9 min-w-[100px] items-center justify-center rounded-[8px] px-2.5 text-[12px] font-extrabold tracking-wider ${REF_PILL[row.status]}`}
    >
      {row.status.toUpperCase()}
    </span>
  );
}

/**
 * Desktop radar table (Instrument / Status / Bias / Score).
 * Rows are keyboard navigable: Tab reaches the table, arrow keys move
 * between rows, Enter/Space selects when onRowSelect is provided.
 */
export function RankTable({ rows, onRowSelect, caption, variant = 'default', leading }: RankTableProps) {
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

  if (variant === 'reference') {
    return (
      <div
        className="overflow-x-auto rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-[var(--shadow-row)]"
        role="region"
        aria-label={caption ? `${caption} — scroll horizontally on small screens` : 'Radar results table — scroll horizontally on small screens'}
        tabIndex={0}
      >
        <table className="w-full border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="bg-[var(--color-mint-wash)] text-sm text-[var(--color-text)]">
              <th scope="col" className="px-3.5 py-2 font-bold">Instrument</th>
              <th scope="col" className="px-3.5 py-2 font-bold">Status</th>
              <th scope="col" className="px-3.5 py-2 font-bold">Bias</th>
              <th scope="col" className="px-3.5 py-2 text-right font-bold">Score</th>
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
                onClick={onRowSelect && !row.unranked ? () => onRowSelect(row) : undefined}
                onKeyDown={(e) => handleKeyDown(e, i)}
                aria-label={onRowSelect && !row.unranked ? `Open ${row.pair}` : undefined}
                className={`border-t border-[var(--color-border-soft)] ${
                  onRowSelect && !row.unranked ? 'cursor-pointer hover:bg-[var(--color-surface-hover)]' : ''
                }`}
              >
                <td className="px-3.5 py-2">
                  <span className="flex items-center gap-2.5">
                    {leading?.(row)}
                    <span className="text-[15px] font-extrabold tracking-tight text-[var(--color-text)]">
                      {row.pair}
                    </span>
                  </span>
                </td>
                <td className="px-3.5 py-2">
                  <ReferencePill row={row} />
                </td>
                <td className="px-3.5 py-2">
                  {row.bias && !row.unranked ? (
                    <BiasText bias={row.bias} showArrow={false} className="text-[15px]" />
                  ) : (
                    <span className="text-[var(--color-text-muted)]">—</span>
                  )}
                </td>
                <td className="tnum px-3.5 py-2 text-right text-2xl font-extrabold text-[var(--color-text)]">
                  {typeof row.score === 'number' && !row.unranked ? (
                    row.score
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
            <th scope="col" className="px-3.5 py-2 font-semibold">Instrument</th>
            <th scope="col" className="px-3.5 py-2 font-semibold">Status</th>
            <th scope="col" className="px-3.5 py-2 font-semibold">Bias</th>
            <th scope="col" className="px-3.5 py-2 text-right font-semibold">Score</th>
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
              className={`border-t border-[var(--color-border)] text-sm ${
                onRowSelect ? 'cursor-pointer hover:bg-[var(--color-surface-hover)]' : ''
              }`}
            >
              <td className="px-3.5 py-2 font-bold text-[var(--color-text)]">{row.pair}</td>
              <td className="px-3.5 py-2">
                <StatusPill status={row.status} />
              </td>
              <td className="px-3.5 py-2">
                {row.bias ? (
                  <BiasText bias={row.bias} />
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                )}
              </td>
              <td className="tnum px-3.5 py-2 text-right font-bold text-[var(--color-text)]">
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
