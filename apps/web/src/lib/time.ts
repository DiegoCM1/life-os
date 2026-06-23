import { TIMEZONE } from '@/config/goals';

/** YYYY-MM-DD for "today" in the dashboard's timezone, regardless of device tz. */
export function todayMx(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
}

/** Current wall-clock parts in the dashboard's timezone. */
export function nowPartsMx(): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Intl may report hour 24 at midnight in some engines.
  return { hour: get('hour') % 24, minute: get('minute'), second: get('second') };
}

/** ISO date shifted by `delta` days (noon UTC base avoids DST edge cases). */
export function isoAddDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Sanitize a ?day= param: a real YYYY-MM-DD no later than today, else today. */
export function parseDay(value: string | undefined, today: string): string {
  if (!value) return today;
  const d = new Date(`${value}T12:00:00Z`);
  if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value && value <= today) {
    return value;
  }
  return today;
}

/** Human label for an ISO date, e.g. "Wed, Jun 18" (UTC base, tz-stable). */
export function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
