// Pure aggregation helpers for topic detail pages. All run server-side on the
// raw daily_log / applications series; charts receive small pre-computed arrays.

import type { MonthLog } from '@/lib/api';
import { isoAddDays } from '@/lib/time';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function doneDates(logs: MonthLog[], goalId: string): Set<string> {
  return new Set(logs.filter((l) => l.goal_id === goalId && l.done).map((l) => l.log_date));
}

/** Monday-indexed weekday (0..6) of an ISO date. */
export function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/** Every ISO date in the window ending today, oldest first. */
export function dateWindow(today: string, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(isoAddDays(today, -i));
  return out;
}

// ---------- habit stats ----------

export type HabitStats = {
  currentStreak: number;
  longestStreak: number;
  doneInRange: number;
  ratePercent: number;
};

export function habitStats(
  logs: MonthLog[],
  goalId: string,
  today: string,
  days: number
): HabitStats {
  const done = doneDates(logs, goalId);
  const window = dateWindow(today, days);

  // current streak ends today, or yesterday when today isn't logged yet
  let cursor = done.has(today) ? today : isoAddDays(today, -1);
  let currentStreak = 0;
  while (done.has(cursor)) {
    currentStreak += 1;
    cursor = isoAddDays(cursor, -1);
  }

  let longestStreak = 0;
  let run = 0;
  let doneInRange = 0;
  let prevDone = false;
  for (const date of window) {
    if (done.has(date)) {
      doneInRange += 1;
      run = prevDone ? run + 1 : 1;
      longestStreak = Math.max(longestStreak, run);
      prevDone = true;
    } else {
      prevDone = false;
    }
  }

  return {
    currentStreak,
    longestStreak,
    doneInRange,
    ratePercent: Math.round((doneInRange / days) * 100),
  };
}

// ---------- generic series builders (work for habits and applications) ----------

export type LabeledCount = { label: string; value: number };

/** Per-day value series for the window: habit → 0/1, apps → count. */
export function dailySeries(
  today: string,
  days: number,
  valueOf: (date: string) => number
): { date: string; value: number }[] {
  return dateWindow(today, days).map((date) => ({ date, value: valueOf(date) }));
}

/** Totals per Mon-start week, oldest first (label = week start MM/DD). */
export function weeklyTotals(
  today: string,
  days: number,
  valueOf: (date: string) => number
): LabeledCount[] {
  const buckets = new Map<string, number>();
  for (const date of dateWindow(today, days)) {
    const monday = isoAddDays(date, -weekdayIndex(date));
    buckets.set(monday, (buckets.get(monday) ?? 0) + valueOf(date));
  }
  return [...buckets.entries()].map(([monday, value]) => ({
    label: monday.slice(5).replace('-', '/'),
    value,
  }));
}

/** Totals per calendar month in the window, oldest first. */
export function monthlyTotals(
  today: string,
  days: number,
  valueOf: (date: string) => number
): LabeledCount[] {
  const buckets = new Map<string, number>();
  for (const date of dateWindow(today, days)) {
    const key = date.slice(0, 7);
    buckets.set(key, (buckets.get(key) ?? 0) + valueOf(date));
  }
  return [...buckets.entries()].map(([ym, value]) => ({
    label: MONTH_LABELS[Number(ym.slice(5)) - 1],
    value,
  }));
}

/** Totals by weekday across the window — the "which days do I show up" pattern. */
export function weekdayTotals(
  today: string,
  days: number,
  valueOf: (date: string) => number
): LabeledCount[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const date of dateWindow(today, days)) {
    counts[weekdayIndex(date)] += valueOf(date);
  }
  return WEEKDAY_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

/** Trailing 7-day rolling sum for each day in the window (trend smoothing). */
export function rolling7(
  today: string,
  days: number,
  valueOf: (date: string) => number
): { date: string; value: number }[] {
  return dateWindow(today, days).map((date) => {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += valueOf(isoAddDays(date, -i));
    return { date, value: sum };
  });
}
