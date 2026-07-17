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

/** Minutes since local midnight (0..1439) for an instant, in TIMEZONE. */
export function minutesOfDayMx(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return (get('hour') % 24) * 60 + get('minute');
}

/** "7:32 AM" from minutes-since-midnight. Pure — safe in client components. */
export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes) % 60;
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** YYYY-MM-DD of an instant in TIMEZONE — used to spot back-filled days. */
export function mxDateOf(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(iso));
}

/** ISO date shifted by `delta` days (noon UTC base avoids DST edge cases). */
export function isoAddDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Monday (ISO date) of the week containing `iso` — Mon-based week, tz-stable. */
export function mondayOfWeekMx(iso: string): string {
  const idx = (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return isoAddDays(iso, -idx);
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

/**
 * True when a completion was logged after its deadline. `doneAtIso` is the
 * server instant done flipped true; `hour` is the deadline hour in TIMEZONE on
 * `logDate`. Compares full wall-clock datetimes so same-day-after-deadline and
 * later-day back-fills both count as late.
 */
export function isLate(logDate: string, doneAtIso: string | null, hour: number | undefined): boolean {
  if (!doneAtIso || hour === undefined) return false;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(doneAtIso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const hh = String(Number(get('hour')) % 24).padStart(2, '0');
  const stamp = `${get('year')}-${get('month')}-${get('day')} ${hh}:${get('minute')}:${get('second')}`;
  return stamp > `${logDate} ${String(hour).padStart(2, '0')}:00:00`;
}

/** Wall-clock time of an instant in TIMEZONE, e.g. "6:45 AM". */
export function formatTimeMx(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
