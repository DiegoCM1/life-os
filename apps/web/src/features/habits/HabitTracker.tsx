// The centerpiece: habit buttons on the side, spiral grid on the right.
// Tapping a button writes today's check-in and fills one green cell.
// The spiral switches week/month/year via ?spiral= (server-rendered links).

import { APPLICATIONS_DAILY_TARGET, GOAL_DEADLINE_HOUR, GOALS } from '@/config/goals';
import type { MonthLog, TodayLog } from '@/lib/api';
import type { Range } from '@/lib/range';
import { isLate, isoAddDays, mondayOfWeekMx, nowPartsMx } from '@/lib/time';
import RangeToggle from '@/components/RangeToggle';
import ActivityItem from './ActivityItem';
import HabitSpiral, { type SpiralRing } from './HabitSpiral';

export default function HabitTracker({
  dayLogs,
  rangeLogs,
  appsDaily,
  today,
  selectedDay,
  appsCount,
  spiralRange,
  dayTreguaDates,
}: {
  dayLogs: TodayLog[]; // the day being viewed/edited (today by default)
  rangeLogs: MonthLog[]; // full window for the selected spiral range
  appsDaily: { date: string; count: number }[]; // Notion applications per day
  today: string;
  selectedDay: string; // date that taps write to
  appsCount: number | null;
  spiralRange: Range;
  dayTreguaDates: Set<string>; // dates declared a whole-day Tregua
}) {
  const logByGoal = new Map(dayLogs.map((l) => [l.goal_id, l]));
  const dayTreguaSelected = dayTreguaDates.has(selectedDay);

  // Tregua dates per goal: a date is excused if the activity itself is Tregua, or
  // the whole day is. Used to bridge the streak and paint the spiral purple.
  const treguaDatesByGoal = new Map<string, Set<string>>(
    GOALS.map((g) => [g.id, new Set(dayTreguaDates)]),
  );
  for (const log of rangeLogs) {
    if (log.tregua) treguaDatesByGoal.get(log.goal_id)?.add(log.log_date);
  }

  // Per-goal done-count over the active spiral window, with a matching label, so
  // the button reads "N this week/month/year" in step with the spiral.
  const periodStart =
    spiralRange === 'week'
      ? mondayOfWeekMx(today) // current week, Mon→today
      : spiralRange === 'year'
        ? isoAddDays(today, -364)
        : `${today.slice(0, 8)}01`; // month: from the 1st
  const periodLabel =
    spiralRange === 'week' ? 'this week' : spiralRange === 'year' ? 'this year' : 'this month';
  const periodDoneCount = new Map<string, number>();
  for (const log of rangeLogs) {
    if (log.done && log.log_date >= periodStart) {
      periodDoneCount.set(log.goal_id, (periodDoneCount.get(log.goal_id) ?? 0) + 1);
    }
  }

  // Streak per goal: consecutive qualifying days ending today (or yesterday, so a
  // not-yet-logged today doesn't read as broken before the day is over). A day
  // qualifies if it was done — except for goals flagged streakNeedsOnTime (e.g.
  // wake-up), where a LATE completion does not qualify and breaks the streak.
  const onTimeRequired = new Map(GOALS.map((g) => [g.id, g.streakNeedsOnTime ?? false]));
  const qualifies = (log: MonthLog): boolean =>
    !!log.done &&
    !(onTimeRequired.get(log.goal_id) && isLate(log.log_date, log.done_at, GOAL_DEADLINE_HOUR[log.goal_id]));

  const streakDatesByGoal = new Map<string, Set<string>>();
  const todayLogByGoal = new Map<string, MonthLog>();
  for (const log of rangeLogs) {
    if (log.log_date === today) todayLogByGoal.set(log.goal_id, log);
    if (!qualifies(log)) continue;
    if (!streakDatesByGoal.has(log.goal_id)) streakDatesByGoal.set(log.goal_id, new Set());
    streakDatesByGoal.get(log.goal_id)!.add(log.log_date);
  }
  const streakFor = (goalId: string): number => {
    const dates = streakDatesByGoal.get(goalId) ?? new Set<string>();
    const tregua = treguaDatesByGoal.get(goalId) ?? new Set<string>();
    let cursor: string;
    if (dates.has(today)) {
      cursor = today;
    } else if (tregua.has(today)) {
      cursor = isoAddDays(today, -1); // today excused → bridge over it
    } else {
      // today logged but not qualifying (e.g. a late wake-up) → broken now.
      const tl = todayLogByGoal.get(goalId);
      if (tl?.done && !qualifies(tl)) return 0;
      cursor = isoAddDays(today, -1);
    }
    // Count successes; bridge (skip without counting) Tregua days; stop at a miss.
    let streak = 0;
    while (dates.has(cursor) || tregua.has(cursor)) {
      if (dates.has(cursor)) streak += 1;
      cursor = isoAddDays(cursor, -1);
    }
    return streak;
  };

  const appsDone = appsCount !== null && appsCount >= APPLICATIONS_DAILY_TARGET;

  // A "why not done" note is required once an unfulfilled activity's window has
  // closed: any past day, or today once the deadline hour has passed (goals with
  // no deadline only close at end of day, so they never nag on today). The field
  // also shows — calmly — whenever a note already exists, so you can read/edit it.
  const currentHour = nowPartsMx().hour;
  const noteState = (goalId: string, fulfilled: boolean, tregua: boolean) => {
    const log = logByGoal.get(goalId);
    const deadlineHour = GOAL_DEADLINE_HOUR[goalId];
    const windowClosed =
      selectedDay < today ||
      (selectedDay === today && deadlineHour !== undefined && currentHour >= deadlineHour);
    const required = windowClosed && !fulfilled && !tregua;
    const note = log?.note ?? '';
    // A Tregua activity shows its reason via the Tregua control, not here.
    return { required, note, show: !tregua && (required || note.trim() !== '') };
  };

  // ---- build one spiral ring per tracked thing ----
  const rings: SpiralRing[] = [];

  // habit toggles: 1 on done days; track which were completed late, plus any
  // saved note (done, missed, or Tregua reason) for the hover tooltip.
  for (const g of GOALS) {
    const hour = GOAL_DEADLINE_HOUR[g.id];
    const fraction = new Map<string, number>();
    const lateDates = new Set<string>();
    const notes = new Map<string, string>();
    for (const log of rangeLogs) {
      if (log.goal_id !== g.id) continue;
      if (log.done) {
        fraction.set(log.log_date, 1);
        if (isLate(log.log_date, log.done_at, hour)) lateDates.add(log.log_date);
      }
      if (log.note && log.note.trim() !== '') notes.set(log.log_date, log.note);
    }
    rings.push({
      id: g.id,
      label: g.label,
      fraction,
      lateDates,
      treguaDates: treguaDatesByGoal.get(g.id),
      notes,
    });
  }

  // applications (Notion): fraction of the daily target met
  const appsFraction = new Map<string, number>();
  for (const d of appsDaily) {
    if (d.count > 0) appsFraction.set(d.date, Math.min(1, d.count / APPLICATIONS_DAILY_TARGET));
  }
  rings.push({
    id: 'applications',
    label: 'Applications',
    fraction: appsFraction,
    treguaDates: new Set(dayTreguaDates), // applications follow whole-day Tregua only
  });

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="section-title mb-0">Habit tracker</h2>
        <RangeToggle basePath="/" param="spiral" active={spiralRange} />
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex w-full flex-col gap-2.5 md:w-72">
          {GOALS.map((g) => {
            const log = logByGoal.get(g.id);
            const done = log?.done === true;
            const tregua = (log?.tregua ?? false) || dayTreguaSelected;
            const ns = noteState(g.id, done, tregua);
            return (
              <ActivityItem
                key={g.id}
                goalId={g.id}
                label={g.label}
                logDate={selectedDay}
                done={log?.done ?? false}
                late={isLate(selectedDay, log?.done_at ?? null, GOAL_DEADLINE_HOUR[g.id])}
                tregua={tregua}
                count={periodDoneCount.get(g.id) ?? 0}
                countLabel={periodLabel}
                streak={streakFor(g.id)}
                oneShot={g.oneShot}
                doneAt={log?.done_at ?? null}
                noteRequired={ns.required}
                note={log?.note ?? ''}
              />
            );
          })}

          <div className="my-1 border-t border-edge" />

          {/* read-only: applications live in Notion, never logged here */}
          <div
            className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-4 py-3 ${
              appsDone ? 'border-good bg-good-dim' : 'border-edge bg-well'
            }`}
          >
            <span className="font-bold tabular-nums">
              {appsCount === null ? '–' : Math.round(appsCount)}/{APPLICATIONS_DAILY_TARGET}
            </span>
            <span className="flex-1">Applications</span>
            <span className="text-[10px] uppercase tracking-wide text-sub">Notion</span>
          </div>
        </div>

        <div className="flex flex-1 justify-center">
          <HabitSpiral rings={rings} today={today} range={spiralRange} selectedDay={selectedDay} />
        </div>
      </div>
    </section>
  );
}
