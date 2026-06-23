import {
  getApplications,
  getApplicationsDaily,
  getLogs,
  getStatus,
  getToday,
} from '@/lib/api';
import { APPLICATIONS_DAILY_TARGET } from '@/config/goals';
import { rangeDays, type Range } from '@/lib/range';
import { isoAddDays, todayMx } from '@/lib/time';
import DeadlineCard from '@/features/deadline/DeadlineCard';
import HabitTracker from '@/features/habits/HabitTracker';
import TopicCards from '@/features/topics/TopicCards';
import RefreshTimer from './RefreshTimer';

export default async function DashboardPage({ spiralRange }: { spiralRange: Range }) {
  const today = todayMx();
  const monthStart = `${today.slice(0, 8)}01`;

  // One fetch serves the spiral (at its selected range), the button counts
  // (current month), and the topic cards' streaks (12 weeks minimum).
  const windowDays = Math.max(84, rangeDays(spiralRange));
  const [todayData, rangeData, apps, appsDaily, status] = await Promise.all([
    getToday(),
    getLogs(isoAddDays(today, -windowDays), today),
    getApplications(),
    getApplicationsDaily(windowDays),
    getStatus(),
  ]);
  const monthLogs = rangeData.logs.filter((l) => l.log_date >= monthStart);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-5">
      <RefreshTimer />

      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <span className="tabular-nums text-sub">{today}</span>
      </header>

      <DeadlineCard
        todayCount={apps.today_count}
        target={APPLICATIONS_DAILY_TARGET}
        postedDone={todayData.logs.find((l) => l.goal_id === 'posted')?.done ?? false}
        prepDone={todayData.logs.find((l) => l.goal_id === 'interview_prep')?.done ?? false}
      />

      <HabitTracker
        todayLogs={todayData.logs}
        monthLogs={monthLogs}
        rangeLogs={rangeData.logs}
        appsDaily={appsDaily.daily}
        today={today}
        appsCount={apps.today_count}
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
