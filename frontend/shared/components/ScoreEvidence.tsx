import { Card } from './Card';
import { DataFreshness } from './DataFreshness';
import { CheckIcon, CrosshairIcon } from './icons';

export interface EvidenceItem {
  label: string;
  value: string;
  /** Reference variant only: row marker tone (default 'positive'). */
  tone?: 'positive' | 'neutral' | 'warning' | 'negative';
}

export interface ScoreEvidenceProps {
  /** Score in points out of 100. */
  score: number;
  /** Evidence rows supplied by the caller — only provided fields render. */
  evidence?: EvidenceItem[];
  /** Data snapshot time (epoch ms); shown next to the evidence. */
  timestamp?: number;
  title?: string;
  /** 'reference' = reference-05 panel: icon-badge title row, score pill,
   *  checked narrative rows ("Label: value"). Default keeps the Z1 panel. */
  variant?: 'default' | 'reference';
  className?: string;
}

function RowMarker({ tone }: { tone: EvidenceItem['tone'] }) {
  if (tone === 'warning' || tone === 'negative') {
    return (
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white ${
          tone === 'warning' ? 'bg-[#c07f13]' : 'bg-[#b3352b]'
        }`}
      >
        !
      </span>
    );
  }
  if (tone === 'neutral') {
    return (
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-text-faint)] text-[11px] font-extrabold text-white"
      >
        i
      </span>
    );
  }
  return (
    <span className="mt-0.5 shrink-0 text-[var(--color-accent)]">
      <CheckIcon size={18} strokeWidth={3} />
    </span>
  );
}

function ReferenceEvidence({
  score,
  evidence,
  timestamp,
  title,
  className = '',
}: Required<Pick<ScoreEvidenceProps, 'score'>> & ScoreEvidenceProps) {
  return (
    <Card className={`p-4 ${className}`} aria-label={title}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
          <CrosshairIcon size={18} />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[16px] font-extrabold tracking-tight text-[var(--color-text)]">
          {title}
        </h3>
        <span className="tnum shrink-0 rounded-full bg-[var(--color-mint-wash)] px-2.5 py-1 text-[13px] font-extrabold text-[var(--color-accent)]">
          {score}/100
        </span>
      </div>
      {typeof timestamp === 'number' && (
        <div className="mt-2 text-right">
          <DataFreshness timestamp={timestamp} className="text-[11px]" />
        </div>
      )}
      {evidence && evidence.length > 0 && (
        <ul className="mt-2">
          {evidence.map((item) => (
            <li
              key={item.label}
              className="flex gap-2 border-t border-[var(--color-border-soft)] py-2 first:border-t-0"
            >
              <RowMarker tone={item.tone} />
              <p className="text-[13px] leading-snug text-[var(--color-text)]">
                <span className="font-bold">{item.label}:</span> {item.value}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
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
  variant = 'default',
  className = '',
}: ScoreEvidenceProps) {
  if (variant === 'reference') {
    return (
      <ReferenceEvidence
        score={score}
        evidence={evidence}
        timestamp={timestamp}
        title={title}
        className={className}
      />
    );
  }
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
