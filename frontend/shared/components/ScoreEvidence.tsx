import { Card } from './Card';
import { DataFreshness } from './DataFreshness';

export interface EvidenceItem {
  label: string;
  value: string;
}

export interface ScoreEvidenceProps {
  /** Score in points out of 100. */
  score: number;
  /** Evidence rows supplied by the caller — only provided fields render. */
  evidence?: EvidenceItem[];
  /** Data snapshot time (epoch ms); shown next to the evidence. */
  timestamp?: number;
  title?: string;
  className?: string;
}

/**
 * Score + evidence panel. Renders exactly the evidence items passed in —
 * no invented contribution breakdowns (handoff §2/§4).
 */
export function ScoreEvidence({
  score,
  evidence,
  timestamp,
  title = 'Score evidence',
  className = '',
}: ScoreEvidenceProps) {
  return (
    <Card className={className} aria-label={title}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">{title}</p>
          <p className="tnum mt-1 text-4xl leading-none font-bold text-[var(--color-text)]">
            {score}
            <span className="ml-1 text-base font-medium text-[var(--color-text-muted)]">
              / 100 points
            </span>
          </p>
        </div>
        {typeof timestamp === 'number' && <DataFreshness timestamp={timestamp} />}
      </div>
      {evidence && evidence.length > 0 && (
        <dl className="mt-4 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {evidence.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 py-2">
              <dt className="text-sm text-[var(--color-text-muted)]">{item.label}</dt>
              <dd className="tnum text-sm font-semibold text-[var(--color-text)]">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
