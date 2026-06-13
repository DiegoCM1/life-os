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

/** Days from today (tz-aware) until an ISO date, floored at 0. */
export function daysUntil(isoDate: string): number {
  const ms = new Date(`${isoDate}T00:00:00`).getTime() - new Date(`${todayMx()}T00:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}
