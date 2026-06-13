// The centerpiece: habit buttons on the side, spiral grid on the right.
// Tapping a button writes today's check-in and fills one green cell.

import { APPLICATIONS_DAILY_TARGET, GOALS } from '@/config/goals';
import type { MonthLog, TodayLog } from '@/lib/api';
import NumberStepper from '@/components/NumberStepper';
import HabitButton from './HabitButton';
import HabitSpiral from './HabitSpiral';

export default function HabitTracker({ todayLogs, monthLogs, today, appsCount }: {
  todayLogs: TodayLog[];
  monthLogs: MonthLog[];
  today: string;
  appsCount: number | null;
}) {
  const logByGoal = new Map(todayLogs.map((l) => [l.goal_id, l]));

  const monthDoneCount = new Map<string, number>();
  for (const log of monthLogs) {
    if (log.done) monthDoneCount.set(log.goal_id, (monthDoneCount.get(log.goal_id) ?? 0) + 1);
  }

  const appsDone = appsCount !== null && appsCount >= APPLICATIONS_DAILY_TARGET;

  return (
    <section className="card">
      <h2 className="section-title">Habit tracker</h2>
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex w-full flex-col gap-2.5 md:w-72">
          {GOALS.filter((g) => g.type === 'toggle').map((g) => (
            <HabitButton
              key={g.id}
              goalId={g.id}
              label={g.label}
              done={logByGoal.get(g.id)?.done ?? false}
              monthCount={monthDoneCount.get(g.id) ?? 0}
            />
          ))}

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

          {GOALS.filter((g) => g.type === 'number').map((g) => (
            <NumberStepper
              key={g.id}
              kind="log"
              id={g.id}
              label={g.label}
              unit={g.unit}
              target={g.target}
              value={logByGoal.get(g.id)?.value ?? 0}
            />
          ))}
        </div>

        <div className="flex flex-1 justify-center">
          <HabitSpiral monthLogs={monthLogs} today={today} />
        </div>
      </div>
    </section>
  );
}
