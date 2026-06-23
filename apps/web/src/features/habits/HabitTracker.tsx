// The centerpiece: habit buttons on the side, spiral grid on the right.
// Tapping a button writes today's check-in and fills one green cell.
// The spiral switches week/month/year via ?spiral= (server-rendered links).

import { APPLICATIONS_DAILY_TARGET, GOAL_DEADLINE_HOUR, GOALS } from '@/config/goals';
import type { MonthLog, TodayLog } from '@/lib/api';
import type { Range } from '@/lib/range';
import { isLate, isoAddDays, nowPartsMx } from '@/lib/time';
import NumberStepper from '@/components/NumberStepper';
import RangeToggle from '@/components/RangeToggle';
import ActivityNote from './ActivityNote';
import HabitButton from './HabitButton';
import HabitSpiral, { type SpiralRing } from './HabitSpiral';

export default function HabitTracker({
  dayLogs,
  monthLogs,
  rangeLogs,
  appsDaily,
  today,
  selectedDay,
  appsCount,
  spiralRange,
}: {
  dayLogs: TodayLog[]; // the day being viewed/edited (today by default)
  monthLogs: MonthLog[]; // current month only (button counts)
  rangeLogs: MonthLog[]; // full window for the selected spiral range
  appsDaily: { date: string; count: number }[]; // Notion applications per day
  today: string;
  selectedDay: string; // date that taps write to
  appsCount: number | null;
  spiralRange: Range;
}) {
  const logByGoal = new Map(dayLogs.map((l) => [l.goal_id, l]));

  const monthDoneCount = new Map<string, number>();
  for (const log of monthLogs) {
    if (log.done) monthDoneCount.set(log.goal_id, (monthDoneCount.get(log.goal_id) ?? 0) + 1);
  }

  // Streak per goal: consecutive done days ending today (or yesterday, so a
  // not-yet-logged today doesn't read as broken before the day is over).
  const doneDatesByGoal = new Map<string, Set<string>>();
  for (const log of rangeLogs) {
    if (!log.done) continue;
    if (!doneDatesByGoal.has(log.goal_id)) doneDatesByGoal.set(log.goal_id, new Set());
    doneDatesByGoal.get(log.goal_id)!.add(log.log_date);
  }
  const streakFor = (goalId: string): number => {
    const done = doneDatesByGoal.get(goalId);
    if (!done) return 0;
    let cursor = done.has(today) ? today : isoAddDays(today, -1);
    let streak = 0;
    while (done.has(cursor)) {
      streak += 1;
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
  const noteState = (goalId: string, fulfilled: boolean) => {
    const log = logByGoal.get(goalId);
    const deadlineHour = GOAL_DEADLINE_HOUR[goalId];
    const windowClosed =
      selectedDay < today ||
      (selectedDay === today && deadlineHour !== undefined && currentHour >= deadlineHour);
    const required = windowClosed && !fulfilled;
    const note = log?.note ?? '';
    return { required, note, show: required || note.trim() !== '' };
  };

  // ---- build one spiral ring per tracked thing (5 total) ----
  const toggleGoals = GOALS.filter((g) => g.type === 'toggle');
  const deepWork = GOALS.find((g) => g.type === 'number');

  const rings: SpiralRing[] = [];

  // toggles: 1 on done days; track which of those were completed late
  for (const g of toggleGoals) {
    const hour = GOAL_DEADLINE_HOUR[g.id];
    const fraction = new Map<string, number>();
    const lateDates = new Set<string>();
    for (const log of rangeLogs) {
      if (log.goal_id === g.id && log.done) {
        fraction.set(log.log_date, 1);
        if (isLate(log.log_date, log.done_at, hour)) lateDates.add(log.log_date);
      }
    }
    rings.push({ id: g.id, label: g.label, fraction, lateDates });
  }

  // applications (Notion): fraction of the daily target met
  const appsFraction = new Map<string, number>();
  for (const d of appsDaily) {
    if (d.count > 0) appsFraction.set(d.date, Math.min(1, d.count / APPLICATIONS_DAILY_TARGET));
  }
  rings.push({ id: 'applications', label: 'Applications', fraction: appsFraction });

  // deep work hours: fraction of the daily target met
  if (deepWork) {
    const target = deepWork.target ?? 1;
    const fraction = new Map<string, number>();
    for (const log of rangeLogs) {
      if (log.goal_id === deepWork.id && log.value)
        fraction.set(log.log_date, Math.min(1, log.value / target));
    }
    rings.push({ id: deepWork.id, label: deepWork.label, fraction });
  }

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="section-title mb-0">Habit tracker</h2>
        <RangeToggle basePath="/" param="spiral" active={spiralRange} />
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex w-full flex-col gap-2.5 md:w-72">
          {toggleGoals.map((g) => {
            const log = logByGoal.get(g.id);
            const ns = noteState(g.id, log?.done === true);
            return (
              <div key={g.id} className="flex flex-col gap-2">
                <HabitButton
                  goalId={g.id}
                  label={g.label}
                  done={log?.done ?? false}
                  late={isLate(selectedDay, log?.done_at ?? null, GOAL_DEADLINE_HOUR[g.id])}
                  monthCount={monthDoneCount.get(g.id) ?? 0}
                  streak={streakFor(g.id)}
                  logDate={selectedDay}
                />
                {ns.show && (
                  <ActivityNote
                    goalId={g.id}
                    logDate={selectedDay}
                    initialNote={ns.note}
                    required={ns.required}
                  />
                )}
              </div>
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

          {GOALS.filter((g) => g.type === 'number').map((g) => {
            const log = logByGoal.get(g.id);
            const value = log?.value ?? 0;
            const ns = noteState(g.id, value >= (g.target ?? Infinity));
            return (
              <div key={g.id} className="flex flex-col gap-2">
                <NumberStepper
                  id={g.id}
                  label={g.label}
                  unit={g.unit}
                  target={g.target}
                  value={value}
                  logDate={selectedDay}
                />
                {ns.show && (
                  <ActivityNote
                    goalId={g.id}
                    logDate={selectedDay}
                    initialNote={ns.note}
                    required={ns.required}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-1 justify-center">
          <HabitSpiral rings={rings} today={today} range={spiralRange} selectedDay={selectedDay} />
        </div>
      </div>
    </section>
  );
}
