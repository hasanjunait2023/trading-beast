/**
 * Economic Calendar provider interface (B5, handoff §3 row 12 / §5).
 *
 * No licensed calendar feed exists in this repo: there is no provider, no
 * credentials and no event data source. This module therefore defines ONLY
 * the contract a future licensed provider must satisfy, plus the
 * not-configured implementation that is wired today. There are no sample
 * events anywhere — listEvents on the current provider throws a typed
 * CalendarNotConfigured error rather than returning fabricated data.
 */

export interface CalendarEvent {
  /** Licensed provider event ID — stable across revisions of the event. */
  id: string;
  /** Provider revision timestamp (ISO 8601) for this version of the event. */
  revision: string;
  title: string;
  /** Currency/country code the event belongs to, e.g. "USD". */
  currency: string;
  /** IANA time zone the provider publishes the event time in. */
  zone: string;
  /** Event time as Unix seconds (UTC). */
  ts: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Released value; null until the event has actually been published. */
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

export interface CalendarRange {
  /** Unix seconds, inclusive. */
  from: number;
  /** Unix seconds, exclusive. */
  to: number;
}

export interface EconomicCalendarProvider {
  readonly name: string | null;
  status(): { configured: boolean; provider: string | null };
  listEvents(range: CalendarRange): Promise<CalendarEvent[]>;
}

export class CalendarNotConfiguredError extends Error {
  readonly code = 'CALENDAR_NOT_CONFIGURED';
  constructor() {
    super('Economic calendar is not configured: no licensed calendar provider');
    this.name = 'CalendarNotConfiguredError';
  }
}

/** The provider wired today: honest about the missing feed. */
export class NotConfiguredCalendarProvider implements EconomicCalendarProvider {
  readonly name = null;
  status(): { configured: boolean; provider: string | null } {
    return { configured: false, provider: null };
  }
  async listEvents(_range: CalendarRange): Promise<CalendarEvent[]> {
    throw new CalendarNotConfiguredError();
  }
}

export const calendarProvider: EconomicCalendarProvider = new NotConfiguredCalendarProvider();

export function getCalendarStatus(): { configured: boolean; provider: string | null } {
  return calendarProvider.status();
}
