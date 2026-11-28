/** Format a session window as "08:00 – 16:00 GMT" in the window's own zone. */
export function fmtSessionRange(startMs: number, endMs: number, zone: string): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const zoneName =
    new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'short' })
      .formatToParts(new Date(startMs))
      .find((p) => p.type === 'timeZoneName')?.value ?? '';
  return `${time.format(new Date(startMs))} – ${time.format(new Date(endMs))} ${zoneName}`.trim();
}
