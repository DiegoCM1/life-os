import {
  getApplications,
  getBets,
  getFitness,
  getLogs,
  getStatus,
  getToday,
} from '@/lib/api';
import { APPLICATIONS_DAILY_TARGET } from '@/config/goals';
import { todayMx } from '@/lib/time';
import BetBoard from '@/features/bets/BetBoard';
import DeadlineCard from '@/features/deadline/DeadlineCard';
import FitnessGoalCard from '@/features/fitness/FitnessGoalCard';
import HabitTracker from '@/features/habits/HabitTracker';
import UnscoreableCard from '@/features/unscoreable/UnscoreableCard';
import RefreshTimer from './RefreshTimer';

export default async function DashboardPage() {
  const today = todayMx();
  const monthStart = `${today.slice(0, 8)}01`;

  const [todayData, monthData, betsData, apps, fitness, status] = await Promise.all([
    getToday(),
    getLogs(monthStart, today),
    getBets(),
    getApplications(),
    getFitness(),
    getStatus(),
  ]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-5">
      <RefreshTimer />

      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Today</h1>
        <span className="tabular-nums text-sub">{today}</span>
      </header>

      <DeadlineCard todayCount={apps.today_count} target={APPLICATIONS_DAILY_TARGET} />

      <HabitTracker
        todayLogs={todayData.logs}
        monthLogs={monthData.logs}
        today={today}
        appsCount={apps.today_count}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {betsData.bets.map((bet) => (
          <BetBoard key={bet.id} bet={bet} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FitnessGoalCard fitness={fitness} />
        <UnscoreableCard />
      </section>

      <section className="card flex items-center gap-4 py-3.5">
        <span className="text-xs uppercase tracking-widest text-sub">Milestone</span>
        <span>{status.project_milestone ?? '—'}</span>
      </section>
    </main>
  );
}
