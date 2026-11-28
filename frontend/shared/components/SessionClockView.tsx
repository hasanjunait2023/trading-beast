import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { MarketsHeroArt } from './MarketsHeroArt';
import { SessionHeroArt } from './SessionHeroArt';
import { Skeleton } from './Skeleton';
import { ErrorState } from './ErrorState';
import { Select } from './FormField';
import {
  CalendarIcon,
  CandlesIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  LibertyIcon,
  SunriseIcon,
  TowerClockIcon,
} from './icons';
import type { SessionWindowView, SessionsOverviewView } from '../radar/adapter';

/**
 * Session Clock (reference 06) — one shared view for the Mini App and the
 * web portal. Read-only: renders the backend session windows (adapter has
 * already converted seconds → ms) in a selectable IANA timezone and makes
 * ZERO paid calls.
 *
 * Honesty rules (handoff §3 row 06): the opening-range "quarters" are a
 * TIME-based progress of the first-hour window — the API exposes no candle
 * counts, so no candle coverage, pip range or H/L values are shown. The
 * clock follows the standard FX week and is not a holiday calendar.
 */

type IconComponent = ComponentType<{ size?: number; className?: string }>;

const SESSION_ICONS: Record<string, IconComponent> = {
  Asian: SunriseIcon,
  London: TowerClockIcon,
  'New York': LibertyIcon,
};

/** "02:24 PM" in the given zone. */
function fmtTime(ms: number, zone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ms));
}

function fmtRange(startMs: number, endMs: number, zone: string): string {
  return `${fmtTime(startMs, zone)} – ${fmtTime(endMs, zone)}`;
}

function fmtStartsIn(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 1) return 'Starts in under a minute';
  if (totalMin < 60) return `Starts in ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 48) return m > 0 ? `Starts in ${h} h ${m} min` : `Starts in ${h} h`;
  const d = Math.floor(h / 24);
  return `Starts in ${d} d ${h % 24} h`;
}

type SessionState = 'live' | 'upcoming' | 'closed';

export interface SessionClockViewProps {
  overview: SessionsOverviewView | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  /** Zone to start with (defaults to the device zone). */
  initialZone?: string;
  onZoneChange?: (zone: string) => void;
}

export function SessionClockView({
  overview,
  loading,
  error,
  onRetry,
  initialZone,
  onZoneChange,
}: SessionClockViewProps) {
  const deviceZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [zone, setZone] = useState(initialZone ?? deviceZone);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const zones = useMemo(() => {
    const set = new Set<string>([deviceZone, zone, 'Asia/Dhaka', 'UTC']);
    overview?.sessions.forEach((s) => set.add(s.zone));
    return [...set];
  }, [deviceZone, overview, zone]);

  if (loading && !overview) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading session clock">
        <Skeleton height={150} />
        <Skeleton height={110} />
        <Skeleton height={180} />
      </div>
    );
  }
  if (error && !overview) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }
  if (!overview) return null;

  const nextUpcoming = overview.sessions
    .filter((s) => !s.active)
    .sort((a, b) => a.nextStartMs - b.nextStartMs)[0];

  const stateFor = (s: SessionWindowView): SessionState => {
    if (s.active) return 'live';
    if (nextUpcoming && s.session === nextUpcoming.session) return 'upcoming';
    return 'closed';
  };

  // Opening-range focus: the active session, else the next one to open.
  const orSession =
    overview.sessions.find((s) => s.active) ?? nextUpcoming ?? overview.sessions[0];
  const orQuarters = (() => {
    if (!orSession) return 0;
    if (orSession.orDone) return 4;
    const span = orSession.orEndMs - orSession.sessionStartMs;
    if (span <= 0 || now <= orSession.sessionStartMs) return 0;
    if (now >= orSession.orEndMs) return 4;
    return Math.min(4, Math.floor((now - orSession.sessionStartMs) / (span / 4)));
  })();

  const statePill = (state: SessionState) =>
    state === 'live' ? (
      <span
        className="inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-[13px] font-bold text-white"
        style={{ background: 'var(--gradient-primary-action)' }}
      >
        Active
      </span>
    ) : (
      <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--color-unavailable-bg)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--color-unavailable-text)]">
        {state === 'upcoming' ? 'Upcoming' : 'Closed'}
      </span>
    );

  return (
    <div className="space-y-4">
      {/* Hero (reference 06) — decorative globe/candle artwork, not data. */}
      <section
        aria-label="Session Clock"
        className="relative overflow-hidden rounded-[var(--radius-hero)] text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <SessionHeroArt variant="generic" />
        <MarketsHeroArt />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(3,40,28,0.6) 0%, rgba(3,40,28,0.25) 55%, rgba(3,40,28,0) 82%)',
          }}
        />
        <div className="relative p-5 sm:p-6">
          <p className="text-[13px] font-bold tracking-[0.22em] text-[#a9ecc9]">SESSION CLOCK</p>
          <h1 className="mt-1.5 text-[34px] leading-none font-extrabold tracking-tight sm:text-[40px]">
            Session Clock
          </h1>
          <p className="mt-2.5 max-w-[420px] text-[15px] leading-snug text-white/90">
            Track global FX sessions, opening ranges, and what&apos;s next in the market.
          </p>
        </div>
      </section>

      {/* Local time card. */}
      <section aria-label="Local time" className="rounded-[var(--radius-card-xl)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card-soft)]">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
              <ClockIcon size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-[var(--color-text-muted)]">
                Local Time ({zone})
              </p>
              <p className="tnum mt-0.5 text-[40px] leading-none font-extrabold tracking-tight">
                {fmtTime(now, zone)}
              </p>
              <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
                {overview.fxWeekOpen ? 'FX week is open.' : 'FX week is currently closed.'}
                {overview.overlap ? ' Sessions overlap right now.' : ''}
                {overview.nextTransition
                  ? ` Next change: ${overview.nextTransition.session} ${overview.nextTransition.kind} at ${fmtTime(overview.nextTransition.atMs, zone)}.`
                  : ''}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <Select
              aria-label="Display timezone"
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                onZoneChange?.(e.target.value);
              }}
              className="font-semibold"
              style={{ borderRadius: 9999, paddingLeft: 16, paddingRight: 16 }}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Session timeline (schematic blocks; exact windows labeled). */}
        <div className="mt-6 flex items-start gap-2" aria-label="Session timeline">
          {overview.sessions.map((s) => {
            const state = stateFor(s);
            return (
              <div key={s.session} className="min-w-0 flex-1">
                {state === 'live' ? (
                  <div
                    className="relative rounded-[18px] px-2 py-2.5 text-center text-white shadow-[var(--shadow-hero)]"
                    style={{ background: 'var(--gradient-primary-action)' }}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -top-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45"
                      style={{ background: '#087a4b' }}
                    />
                    <p className="flex items-center justify-center gap-1.5 text-[15px] font-bold">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-white" />
                      {s.session}
                    </p>
                    <p className="tnum mt-0.5 text-[11.5px] whitespace-nowrap text-white/90">
                      {fmtRange(s.sessionStartMs, s.sessionEndMs, zone)}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex h-[62px] items-start justify-center pt-1">
                      <span aria-hidden="true" className="h-3 w-full rounded-full bg-[var(--color-control-track)]" />
                    </div>
                    <p className="mt-1.5 text-center text-[15px] font-bold">{s.session}</p>
                    <p className="tnum mt-0.5 text-center text-[11.5px] whitespace-nowrap text-[var(--color-text-muted)]">
                      {fmtRange(s.sessionStartMs, s.sessionEndMs, zone)}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Session rows. */}
        <ul className="mt-4 divide-y divide-[var(--color-border-soft)]">
          {overview.sessions.map((s) => {
            const state = stateFor(s);
            const Icon = SESSION_ICONS[s.session] ?? ClockIcon;
            return (
              <li
                key={s.session}
                className={`flex items-center gap-3.5 px-2 py-3.5 ${state === 'live' ? '-mx-2 rounded-[var(--radius-lg)] bg-[var(--color-mint-panel)] px-4' : ''}`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
                  <Icon size={26} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16.5px] font-bold">{s.session} Session</span>
                  <span className="tnum block text-[13.5px] text-[var(--color-text-muted)]">
                    {fmtRange(s.sessionStartMs, s.sessionEndMs, zone)}
                  </span>
                </span>
                {statePill(state)}
              </li>
            );
          })}
        </ul>
      </section>

      {/* First-hour opening range — time-based progress only. */}
      {orSession && (
        <section aria-label="Opening range" className="rounded-[var(--radius-card-xl)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card-soft)]">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
              <CandlesIcon size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] font-extrabold tracking-tight">First-hour Opening Range</h2>
              <p className="tnum mt-0.5 text-[14px] text-[var(--color-text-muted)]">
                {orSession.session} • {fmtRange(orSession.sessionStartMs, orSession.orEndMs, zone)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="tnum text-[26px] leading-none font-extrabold text-[var(--color-accent)]">
                {orQuarters} / 4
              </p>
              <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">quarters elapsed</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="flex h-9 flex-1 items-center justify-center rounded-[10px] text-white"
                style={
                  i < orQuarters
                    ? { background: 'var(--gradient-primary-action)' }
                    : { background: 'var(--color-control-track)' }
                }
              >
                {i < orQuarters && <CheckIcon size={18} />}
              </span>
            ))}
          </div>
          <p className="mt-3.5 text-[13.5px] text-[var(--color-text-muted)]">
            {orSession.orDone
              ? 'The opening-range window for this session has ended.'
              : now < orSession.sessionStartMs
                ? `The window opens at ${fmtTime(orSession.sessionStartMs, zone)}.`
                : `The window ends at ${fmtTime(orSession.orEndMs, zone)}.`}{' '}
            Quarter progress is time-based — it does not by itself confirm candle coverage or a
            breakout.
          </p>
        </section>
      )}

      {/* Upcoming session. */}
      {nextUpcoming && (
        <section aria-label="Upcoming session" className="flex items-center gap-3.5 rounded-[var(--radius-card-xl)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card-soft)]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
            <CalendarIcon size={25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[var(--color-text-muted)]">Upcoming Session</p>
            <p className="truncate text-[18px] font-extrabold tracking-tight">
              {nextUpcoming.session} Session
            </p>
            <p className="tnum mt-0.5 text-[13.5px] text-[var(--color-text-muted)]">
              {fmtStartsIn(nextUpcoming.nextStartMs - now)} •{' '}
              {fmtRange(nextUpcoming.nextStartMs, nextUpcoming.nextStartMs + (nextUpcoming.sessionEndMs - nextUpcoming.sessionStartMs), zone)}
            </p>
          </div>
          <ChevronRightIcon size={22} className="shrink-0 text-[var(--color-text-faint)]" />
        </section>
      )}

      <p className="text-xs text-[var(--color-text-muted)]">
        Session windows follow the standard FX week ({overview.calendarPolicy ?? 'standard week'});
        this clock is not a holiday calendar.
      </p>
    </div>
  );
}
