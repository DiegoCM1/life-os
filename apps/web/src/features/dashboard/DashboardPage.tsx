import {
  getApplications,
  getApplicationsDaily,
  getDayMeta,
  getLogs,
  getStatus,
} from '@/lib/api';
import { APPLICATIONS_DAILY_TARGET, DAY_CLOSE_HOUR, GOALS } from '@/config/goals';
import { rangeDays, type Range } from '@/lib/range';
import { isoAddDays, nowPartsMx, parseDay, todayMx } from '@/lib/time';
import DeadlineCard from '@/features/deadline/DeadlineCard';
import HabitTracker from '@/features/habits/HabitTracker';
import TreguaControl from '@/features/habits/TreguaControl';
import TopicCards from '@/features/topics/TopicCards';
import DayNav from './DayNav';
import DayNote from './DayNote';
import RefreshTimer from './RefreshTimer';

export default async function DashboardPage({ spiralRange, day }: {
  spiralRange: Range;
  day?: string;
}) {
  const today = todayMx();
  const selectedDay = parseDay(day, today);
  const isToday = selectedDay >= today;

  // One fetch serves the spiral (at its selected range), the button counts (over
  // that same range), and the topic cards' streaks (12 weeks minimum). Extend
  // the window back if the selected day is older than the spiral range.
  const windowDays = Math.max(84, rangeDays(spiralRange));
  const windowStart = isoAddDays(today, -windowDays);
  const start = selectedDay < windowStart ? selectedDay : windowStart;
  const [rangeData, apps, appsDaily, status, dayMeta] = await Promise.all([
    getLogs(start, today),
    getApplications(),
    getApplicationsDaily(windowDays),
    getStatus(),
    getDayMeta(start, today),
  ]);

  // The day being viewed/edited — derived from the range we already fetched.
  const dayLogs = rangeData.logs.filter((l) => l.log_date === selectedDay);
  // Notion app count: live total for today, else that day's count from the series.
  const appsCount = isToday
    ? apps.today_count
    : appsDaily.daily.find((d) => d.date === selectedDay)?.count ?? 0;

  // Whole-day Tregua state (per date) for the spiral/streaks, plus this day's.
  const dayTreguaDates = new Set(dayMeta.days.filter((d) => d.tregua).map((d) => d.log_date));
  const selectedMeta = dayMeta.days.find((d) => d.log_date === selectedDay);
  const dayTregua = dayTreguaDates.has(selectedDay);

  // Day completeness drives the (loud, mandatory) day note. The day is complete
  // when every logged goal is done-or-excused and the applications target is met.
  // Notion being unreachable (null) doesn't count against you. A note becomes
  // required once an incomplete, non-Tregua day has closed: any past day, or
  // today after DAY_CLOSE_HOUR.
  const allGoalsSatisfied = GOALS.every((g) => {
    const log = dayLogs.find((l) => l.goal_id === g.id);
    return log?.done === true || log?.tregua === true || dayTregua;
  });
  const appsMet = appsCount === null || appsCount >= APPLICATIONS_DAILY_TARGET || dayTregua;
  const dayComplete = allGoalsSatisfied && appsMet;
  const dayClosed = !isToday || nowPartsMx().hour >= DAY_CLOSE_HOUR;
  const dayNoteRequired = dayClosed && !dayComplete && !dayTregua;

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

      {dayTregua ? (
        <TreguaControl kind="day" logDate={selectedDay} active reason={selectedMeta?.note ?? ''} />
      ) : (
        <>
          <DayNote
            logDate={selectedDay}
            initialNote={selectedMeta?.note ?? ''}
            required={dayNoteRequired}
          />
          <TreguaControl kind="day" logDate={selectedDay} active={false} reason="" />
        </>
      )}

      <HabitTracker
        dayLogs={dayLogs}
        rangeLogs={rangeData.logs}
        appsDaily={appsDaily.daily}
        today={today}
        selectedDay={selectedDay}
        appsCount={appsCount}
        spiralRange={spiralRange}
        dayTreguaDates={dayTreguaDates}
      />

      <section className="card flex items-center gap-4 py-3.5">
        <span className="text-xs uppercase tracking-widest text-sub">Milestone</span>
        <span>{status.project_milestone ?? '—'}</span>
      </section>

      <TopicCards rangeLogs={rangeData.logs} today={today} appsCount={apps.today_count} />
    </main>
  );
}
