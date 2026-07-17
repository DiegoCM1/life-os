// Pure aggregation helpers for topic detail pages. All run server-side on the
// raw daily_log / applications series; charts receive small pre-computed arrays.

import type { MonthLog } from '@/lib/api';
import { isoAddDays, minutesOfDayMx, mondayOfWeekMx, mxDateOf } from '@/lib/time';
import { GOAL_DEADLINE_HOUR, GOAL_FAIL_HOUR } from '@/config/goals';

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

// ---------- wake-time stats (wake_up topic only) ----------
//
// wake_up is a habit you always complete, so done/not-done is meaningless. The
// signal is `done_at` — when the checkbox was tapped, ≈ the actual wake time.
// Everything here is derived from that: how early, and how consistent.

const WAKE_TARGET_MIN = (GOAL_DEADLINE_HOUR.wake_up ?? 8) * 60; // on-time cutoff (08:00)
const WAKE_FAIL_MIN = (GOAL_FAIL_HOUR.wake_up ?? 10) * 60; // failure cutoff (10:00)

export type WakeBand = 'good' | 'late' | 'fail';
export type WakeSample = { date: string; minutes: number; band: WakeBand };

export type WakeStats = {
  samples: WakeSample[]; // one per valid morning, oldest first
  daysLogged: number;
  medianMinutes: number | null; // typical wake time
  stdevMinutes: number | null; // consistency spread (population stdev)
  onTimePercent: number | null; // % of mornings before the target
  weekdayMedian: { label: string; minutes: number | null }[]; // Mon..Sun
  weeklyOnTime: { date: string; value: number }[]; // % on-time per Mon-week
  message: { text: string; tone: 'good' | 'warn' | 'bad' | 'default' };
};

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function summarize(samples: WakeSample[]): {
  median: number | null;
  stdev: number | null;
  onTime: number | null;
} {
  if (samples.length === 0) return { median: null, stdev: null, onTime: null };
  const mins = samples.map((s) => s.minutes);
  const mean = mins.reduce((a, b) => a + b, 0) / mins.length;
  const variance = mins.reduce((a, b) => a + (b - mean) ** 2, 0) / mins.length;
  const onTime = samples.filter((s) => s.minutes < WAKE_TARGET_MIN).length;
  return {
    median: Math.round(median(mins)),
    stdev: Math.round(Math.sqrt(variance)),
    onTime: Math.round((onTime / samples.length) * 100),
  };
}

function bandOf(minutes: number): WakeBand {
  if (minutes < WAKE_TARGET_MIN) return 'good';
  if (minutes < WAKE_FAIL_MIN) return 'late';
  return 'fail';
}

/** Compose the recent-weeks rhythm message from earliness + consistency. */
function wakeMessage(
  recent: { median: number | null; stdev: number | null; onTime: number | null },
  recentCount: number
): WakeStats['message'] {
  if (recentCount < 5 || recent.median === null || recent.stdev === null || recent.onTime === null) {
    return {
      tone: 'default',
      text: 'Not enough mornings logged yet — give it about a week of wake-ups to read your rhythm.',
    };
  }
  const clock = formatClockLocal(recent.median);
  const spread = recent.stdev;
  const onTime = recent.onTime;

  const consistency = spread < 25 ? 'tight' : spread <= 50 ? 'loose' : 'erratic';
  const earliness = onTime >= 75 ? 'early' : onTime >= 40 ? 'mixed' : 'late';

  const firstBy: Record<string, string> = {
    tight: `You wake around ${clock} most days — a tight, steady rhythm (± ${spread} min).`,
    loose: `You wake around ${clock}, but it drifts ± ${spread} min from one day to the next.`,
    erratic: `Your wake time is scattered — around ${clock} on average, swinging ± ${spread} min.`,
  };
  const secondBy: Record<string, string> = {
    early: `You beat the 8:00 target ${onTime}% of mornings. Hold the line.`,
    mixed: `You clear the 8:00 target about ${onTime}% of the time — winnable, not won.`,
    late: `Only ${onTime}% of mornings land before 8:00. The target is slipping.`,
  };

  const tone: WakeStats['message']['tone'] =
    consistency === 'tight' && earliness === 'early'
      ? 'good'
      : consistency === 'erratic' && earliness === 'late'
        ? 'bad'
        : 'warn';

  return { tone, text: `${firstBy[consistency]} ${secondBy[earliness]}` };
}

// Local copy of the clock formatter (stats.ts is a pure server module; keeping the
// string-building here avoids a client-only import path).
function formatClockLocal(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes) % 60;
  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function wakeStats(logs: MonthLog[]): WakeStats {
  // Valid morning = wake_up done, has done_at, not a Tregua, and the tap landed on
  // the same MX calendar day it's logged for (a back-fill taps on a later day and
  // would report a bogus "wake time" — exclude it).
  const samples: WakeSample[] = logs
    .filter(
      (l) =>
        l.goal_id === 'wake_up' &&
        l.done &&
        l.done_at !== null &&
        !l.tregua &&
        mxDateOf(l.done_at) === l.log_date
    )
    .map((l) => {
      const minutes = minutesOfDayMx(l.done_at as string);
      return { date: l.log_date, minutes, band: bandOf(minutes) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const all = summarize(samples);

  // Weekday medians (Mon..Sun): the "which days do I sleep in" pattern.
  const byWeekday: number[][] = [[], [], [], [], [], [], []];
  for (const s of samples) byWeekday[weekdayIndex(s.date)].push(s.minutes);
  const weekdayMedian = WEEKDAY_LABELS.map((label, i) => ({
    label,
    minutes: byWeekday[i].length ? Math.round(median(byWeekday[i])) : null,
  }));

  // On-time rate per Mon-start week (trend of earliness).
  const weekBuckets = new Map<string, { total: number; onTime: number }>();
  for (const s of samples) {
    const monday = mondayOfWeekMx(s.date);
    const b = weekBuckets.get(monday) ?? { total: 0, onTime: 0 };
    b.total += 1;
    if (s.minutes < WAKE_TARGET_MIN) b.onTime += 1;
    weekBuckets.set(monday, b);
  }
  const weeklyOnTime = [...weekBuckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monday, b]) => ({ date: monday, value: Math.round((b.onTime / b.total) * 100) }));

  // Message summarizes the same sample set as the tiles, so the two always agree.
  // ("Last weeks" is honored by the range toggle — the default view is a month.)
  const message = wakeMessage(all, samples.length);

  return {
    samples,
    daysLogged: samples.length,
    medianMinutes: all.median,
    stdevMinutes: all.stdev,
    onTimePercent: all.onTime,
    weekdayMedian,
    weeklyOnTime,
    message,
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
