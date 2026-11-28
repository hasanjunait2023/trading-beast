import type { ReactNode } from 'react';
import { SessionHeroArt, sessionArtVariant, type SessionArtVariant } from './SessionHeroArt';
import { ArrowRightIcon, CalendarIcon } from './icons';

export interface SessionHeroProps {
  /** Session display name, e.g. "London". */
  sessionName: string;
  state: 'live' | 'upcoming' | 'closed';
  /** Pill text override; defaults to LIVE / UPCOMING / CLOSED by state. */
  stateLabel?: string;
  /** Formatted session window, e.g. "08:00 – 16:00 GMT". */
  rangeLabel: string;
  /** "Next:" row content, e.g. "New York 16:00 – 21:00 GMT". Omit to hide. */
  nextLabel?: string;
  /** Artwork variant; defaults from the session name. */
  art?: SessionArtVariant;
  /** Optional footer slot (e.g. a Session Clock button). */
  children?: ReactNode;
  className?: string;
}

const STATE_PILL: Record<SessionHeroProps['state'], string> = {
  live: 'LIVE',
  upcoming: 'UPCOMING',
  closed: 'CLOSED',
};

/**
 * Gradient session hero (R0, reference 03): deep-green gradient card with
 * skyline/world-map artwork, a mint accent bar beside the "{Session}
 * Session" label, the session name at display size with a state pill, the
 * session window, and a "Next:" row. All data comes from the sessions API
 * via the caller — the hero renders no times of its own.
 */
export function SessionHero({
  sessionName,
  state,
  stateLabel,
  rangeLabel,
  nextLabel,
  art,
  children,
  className = '',
}: SessionHeroProps) {
  return (
    <section
      aria-label={`${sessionName} session`}
      className={`relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white shadow-[var(--shadow-hero)] ${className}`}
      style={{ background: 'var(--gradient-session-hero)' }}
    >
      <SessionHeroArt variant={art ?? sessionArtVariant(sessionName)} />
      {/* Left-side darkening keeps text contrast over the artwork. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(3,40,28,0.55) 0%, rgba(3,40,28,0.18) 55%, rgba(3,40,28,0) 78%)' }}
      />
      <div className="relative">
        <div className="flex items-stretch gap-3">
          <span aria-hidden="true" className="w-1.5 rounded-full bg-[var(--color-hero-highlight)]" />
          <div className="min-w-0">
            <p className="text-lg font-medium text-white/95">{sessionName} Session</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="text-[40px] leading-none font-extrabold tracking-tight">{sessionName}</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f5e6] px-3 py-1 text-xs font-bold tracking-wide text-[#04503a]">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#0b9e63]" />
                {stateLabel ?? STATE_PILL[state]}
              </span>
            </div>
          </div>
        </div>
        <p className="tnum mt-4 flex items-center gap-2 text-[15px] text-white/95">
          <CalendarIcon size={19} />
          {rangeLabel}
        </p>
        {nextLabel && (
          <>
            <div aria-hidden="true" className="mt-3 h-px bg-white/25" />
            <p className="tnum mt-3 flex items-center gap-2 text-[15px]">
              <ArrowRightIcon size={19} className="shrink-0 text-[var(--color-hero-highlight)]" />
              <span>
                <span className="font-semibold text-[#a9ecc9]">Next:</span> {nextLabel}
              </span>
            </p>
          </>
        )}
        {children}
      </div>
    </section>
  );
}
