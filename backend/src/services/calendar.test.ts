import { describe, it, expect } from 'vitest';
import {
  NotConfiguredCalendarProvider,
  CalendarNotConfiguredError,
  getCalendarStatus,
} from './calendar.js';

describe('calendar provider (B5)', () => {
  it('status reports not configured with no provider', () => {
    expect(getCalendarStatus()).toEqual({ configured: false, provider: null });
    expect(new NotConfiguredCalendarProvider().status()).toEqual({
      configured: false,
      provider: null,
    });
  });

  it('listEvents throws the typed not-configured error — never sample data', async () => {
    const provider = new NotConfiguredCalendarProvider();
    await expect(provider.listEvents({ from: 0, to: 86400 })).rejects.toBeInstanceOf(
      CalendarNotConfiguredError,
    );
    await expect(provider.listEvents({ from: 0, to: 86400 })).rejects.toMatchObject({
      code: 'CALENDAR_NOT_CONFIGURED',
    });
  });
});
