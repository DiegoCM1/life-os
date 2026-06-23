import {
  getApplications,
  getApplicationsDaily,
  getLogs,
  getStatus,
} from '@/lib/api';
import { APPLICATIONS_DAILY_TARGET } from '@/config/goals';
import { rangeDays, type Range } from '@/lib/range';
import { isoAddDays, parseDay, todayMx } from '@/lib/time';
import DeadlineCard from '@/features/deadline/DeadlineCard';
import HabitTracker from '@/features/habits/HabitTracker';
import TopicCards from '@/features/topics/TopicCards';
import DayNav from './DayNav';
import RefreshTimer from './RefreshTimer';

export default async function DashboardPage({ spiralRange, day }: {
  spiralRange: Range;
  day?: string;
}) {
  const today = todayMx();
  const selectedDay = parseDay(day, today);
  const isToday = selectedDay >= today;
  const monthStart = `${today.slice(0, 8)}01`;

  // One fetch serves the spiral (at its selected range), the button counts
  // (current month), and the topic cards' streaks (12 weeks minimum). Extend
  // the window back if the selected day is older than the spiral range.
  const windowDays = Math.max(84, rangeDays(spiralRange));
  const windowStart = isoAddDays(today, -windowDays);
  const start = selectedDay < windowStart ? selectedDay : windowStart;
  const [rangeData, apps, appsDaily, status] = await Promise.all([
    getLogs(start, today),
    getApplications(),
    getApplicationsDaily(windowDays),
    getStatus(),
  ]);
  const monthLogs = rangeData.logs.filter((l) => l.log_date >= monthStart);

  // The day being viewed/edited — derived from the range we already fetched.
  const dayLogs = rangeData.logs.filter((l) => l.log_date === selectedDay);
  // Notion app count: live total for today, else that day's count from the series.
  const appsCount = isToday
    ? apps.today_count
    : appsDaily.daily.find((d) => d.date === selectedDay)?.count ?? 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-5">
      <RefreshTimer />

      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{isToday ? 'Today' : 'Past day'}</h1>
        <DayNav selectedDay={selectedDay} today={today} spiralRange={spiralRange} />
      </header>

      {isToday ? (
        <DeadlineCard
          todayCount={apps.today_count}
          target={APPLICATIONS_DAILY_TARGET}
          postedDone={dayLogs.find((l) => l.goal_id === 'posted')?.done ?? false}
          prepDone={dayLogs.find((l) => l.goal_id === 'interview_prep')?.done ?? false}
        />
      ) : (
        <section className="card border-accent bg-well py-3 text-center text-sm text-sub">
          Editing a past day — changes save to {selectedDay}.
        </section>
      )}

      <HabitTracker
        dayLogs={dayLogs}
        monthLogs={monthLogs}
        rangeLogs={rangeData.logs}
        appsDaily={appsDaily.daily}
        today={today}
        selectedDay={selectedDay}
        appsCount={appsCount}
        spiralRange={spiralRange}
      />

      <section className="card flex items-center gap-4 py-3.5">
        <span className="text-xs uppercase tracking-widest text-sub">Milestone</span>
        <span>{status.project_milestone ?? '—'}</span>
      </section>

      <TopicCards rangeLogs={rangeData.logs} today={today} appsCount={apps.today_count} />
    </main>
  );
}
