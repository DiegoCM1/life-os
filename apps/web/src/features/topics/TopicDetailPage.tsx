import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  APPLICATION_FUNNEL,
  APPLICATION_STATUS_GROUPS,
  APPLICATIONS_DAILY_TARGET,
  TOPICS,
} from '@/config/goals';
import {
  getApplications,
  getApplicationsDaily,
  getApplicationsStats,
  getLogs,
} from '@/lib/api';
import { isoAddDays, todayMx } from '@/lib/time';
import { palette } from '@/design/tokens';
import RefreshTimer from '@/features/dashboard/RefreshTimer';
import { CountBars, TrendLine, VolumeArea } from './charts';
import Heatmap from './Heatmap';
import { rangeDays, type Range } from '@/lib/range';
import RangeToggle from '@/components/RangeToggle';
import {
  dailySeries,
  doneDates,
  habitStats,
  monthlyTotals,
  rolling7,
  weekdayTotals,
  weeklyTotals,
} from './stats';

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="stat-num">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="section-title">{title}</h2>
      {children}
    </div>
  );
}

export default async function TopicDetailPage({ topicId, range }: {
  topicId: string;
  range: Range;
}) {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) notFound();

  const today = todayMx();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-5">
      <RefreshTimer />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="text-sub hover:text-ink">← Today</Link>
          <h1 className="text-2xl font-bold">{topic.label}</h1>
        </div>
        <RangeToggle basePath={`/topic/${topic.id}`} param="range" active={range} />
      </header>

      {topic.kind === 'applications' ? (
        <ApplicationsDetail today={today} range={range} />
      ) : (
        <HabitDetail topicId={topic.id} today={today} range={range} />
      )}
    </main>
  );
}

// ---------- habit topics ----------

async function HabitDetail({ topicId, today, range }: {
  topicId: string;
  today: string;
  range: Range;
}) {
  const days = rangeDays(range);
  const logsData = await getLogs(isoAddDays(today, -days), today);
  const logs = logsData.logs;
  const done = doneDates(logs, topicId);
  const valueOf = (date: string) => (done.has(date) ? 1 : 0);
  const stats = habitStats(logs, topicId, today, days);

  return (
    <>
      <section className="card flex flex-wrap gap-8">
        <Stat value={stats.currentStreak} label="current streak" />
        <Stat value={stats.longestStreak} label={`longest streak (${range})`} />
        <Stat value={stats.doneInRange} label={`done this ${range}`} />
        <Stat value={`${stats.ratePercent}%`} label="completion rate" />
      </section>

      <ChartCard title="Every day at a glance">
        <Heatmap today={today} days={days} valueOf={valueOf} />
      </ChartCard>

      {range !== 'week' && (
        <ChartCard title="Consistency trend (days done per rolling week)">
          <TrendLine data={rolling7(today, days, valueOf)} name="of last 7 days" yMax={7} />
        </ChartCard>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title={range === 'year' ? 'Days done per month' : 'Days done per week'}>
          <CountBars
            data={
              range === 'year'
                ? monthlyTotals(today, days, valueOf)
                : weeklyTotals(today, days, valueOf)
            }
            name="days done"
            yMax={range === 'year' ? undefined : 7}
          />
        </ChartCard>

        <ChartCard title="Weekday pattern — when do you show up?">
          <CountBars data={weekdayTotals(today, days, valueOf)} name="times done" color={palette.accent} />
        </ChartCard>
      </div>
    </>
  );
}

// ---------- applications ----------

async function ApplicationsDetail({ today, range }: { today: string; range: Range }) {
  const days = rangeDays(range);
  const [daily, summary, stats] = await Promise.all([
    getApplicationsDaily(days),
    getApplications(),
    getApplicationsStats(),
  ]);

  if (!daily.configured && !summary.configured) {
    return (
      <section className="card">
        <p className="text-sub">
          Notion isn&apos;t connected yet — set NOTION_TOKEN and NOTION_DATABASE_ID on the
          backend to light this page up. Applications always stay in Notion; this view
          only reads them.
        </p>
      </section>
    );
  }

  const countByDate = new Map(daily.daily.map((d) => [d.date, d.count]));
  const valueOf = (date: string) => countByDate.get(date) ?? 0;
  const total = daily.daily.reduce((sum, d) => sum + d.count, 0);
  const bestDay = Math.max(0, ...daily.daily.map((d) => d.count));
  const todayCount = summary.today_count;

  return (
    <>
      <section className="card flex flex-wrap gap-8">
        <Stat
          value={todayCount === null ? '–' : `${Math.round(todayCount)}/${APPLICATIONS_DAILY_TARGET}`}
          label="today"
        />
        <Stat value={total} label={`sent this ${range}`} />
        <Stat value={Math.round((total / days) * 10) / 10} label="avg / day" />
        <Stat value={bestDay} label="best day" />
        <Stat value={stats.total} label="all time" />
      </section>

      <ChartCard title="Volume over time">
        {range === 'year' ? (
          <CountBars data={monthlyTotals(today, days, valueOf)} name="applications" color={palette.accent} />
        ) : (
          <VolumeArea data={dailySeries(today, days, valueOf)} name="applications" />
        )}
      </ChartCard>

      {range !== 'week' && (
        <ChartCard title="Every day at a glance">
          <Heatmap today={today} days={days} valueOf={valueOf} maxValue={APPLICATIONS_DAILY_TARGET} />
        </ChartCard>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {range !== 'week' && (
          <ChartCard title="Momentum (sent per rolling week)">
            <TrendLine data={rolling7(today, days, valueOf)} name="last 7 days" color={palette.accent} />
          </ChartCard>
        )}

        <ChartCard title="Weekday pattern — when do you apply?">
          <CountBars data={weekdayTotals(today, days, valueOf)} name="applications" color={palette.accent} />
        </ChartCard>
      </div>

      <PipelineSection statusCounts={stats.status_counts} tierCounts={stats.tier_counts} total={stats.total} />

      <p className="text-xs text-sub">
        Day-by-day charts show only applications you sent. Pipeline and conversion
        below reflect outcomes in Notion — shown for clarity, not as a daily score.
      </p>
    </>
  );
}

// ---------- applications pipeline (all-time, full Notion scan) ----------

function sumStatuses(counts: Record<string, number>, statuses: string[]): number {
  return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
}

function PipelineSection({ statusCounts, tierCounts, total }: {
  statusCounts: Record<string, number>;
  tierCounts: Record<string, number>;
  total: number;
}) {
  if (total === 0) {
    return (
      <ChartCard title="Pipeline">
        <p className="text-sm text-sub">No applications in Notion yet.</p>
      </ChartCard>
    );
  }

  const grouped = new Set(APPLICATION_STATUS_GROUPS.flatMap((g) => g.statuses));
  const ungrouped = Object.entries(statusCounts).filter(([s]) => !grouped.has(s));
  const max = Math.max(1, ...Object.values(statusCounts));

  const reached = sumStatuses(statusCounts, APPLICATION_FUNNEL.reachedInterview);
  const offers = sumStatuses(statusCounts, APPLICATION_FUNNEL.offers);
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <>
      {/* conversion funnel */}
      <section className="card grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat value={total} label="total applied" />
        <Stat value={reached} label={`reached interview · ${pct(reached)}`} />
        <Stat value={offers} label={`offers · ${pct(offers)}`} />
        <Stat
          value={reached === 0 ? '–' : `${Math.round((offers / reached) * 100)}%`}
          label="interview → offer"
        />
      </section>

      {/* grouped status tables */}
      <ChartCard title="Pipeline by status">
        <div className="flex flex-col gap-5">
          {APPLICATION_STATUS_GROUPS.map((group) => {
            const groupTotal = sumStatuses(statusCounts, group.statuses);
            return (
              <div key={group.label}>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-semibold" style={{ color: group.accent }}>
                    {group.label}
                  </span>
                  <span className="text-xs tabular-nums text-sub">
                    {groupTotal} · {pct(groupTotal)}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.statuses.map((status) => (
                    <StatusRow
                      key={status}
                      label={status}
                      count={statusCounts[status] ?? 0}
                      max={max}
                      color={group.accent}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {ungrouped.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-sub">Other</div>
              <div className="flex flex-col gap-1.5">
                {ungrouped.map(([status, count]) => (
                  <StatusRow key={status} label={status} count={count} max={max} color={palette.sub} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ChartCard>

      {/* tier breakdown */}
      {Object.keys(tierCounts).length > 0 && (
        <ChartCard title="By tier">
          <div className="flex flex-col gap-1.5">
            {Object.entries(tierCounts)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([tier, count]) => (
                <StatusRow
                  key={tier}
                  label={tier}
                  count={count}
                  max={Math.max(1, ...Object.values(tierCounts))}
                  color={palette.accent}
                />
              ))}
          </div>
        </ChartCard>
      )}
    </>
  );
}

function StatusRow({ label, count, max, color }: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 truncate text-sm text-sub">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-well">
        <div
          className="h-full rounded-full"
          style={{ width: `${(count / max) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 text-right text-sm font-bold tabular-nums">{count}</span>
    </div>
  );
}
