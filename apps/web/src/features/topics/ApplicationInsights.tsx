// Conversion analytics for the applications topic. Server-rendered by default —
// only the weekly cohort stack needs Recharts (and therefore a client boundary).
//
// Everything here answers one question: of the applications you send, which ones
// actually reach a human? Volume charts live above this section; these are about
// what the volume BUYS you.

import { MIN_SEGMENT_N, OUTCOME_STYLE } from '@/config/goals';
import type { AppsInsights } from '@/lib/api';
import { palette } from '@/design/tokens';
import { OutcomeStack } from './charts';
import {
  funnelStages,
  resolvedConversion,
  segmentRows,
  weeklyRows,
  type SegmentRow,
} from './applicationStats';

const pct = (n: number) => `${n < 10 ? Math.round(n * 10) / 10 : Math.round(n)}%`;

function Card({ title, hint, children }: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h2 className="section-title">{title}</h2>
      {hint && <p className="mb-3 text-xs text-sub">{hint}</p>}
      {children}
    </div>
  );
}

/** The funnel, as descending bars. The number that matters is the drop between
 *  stages, so that is the one rendered in the accent color. */
function FunnelCard({ statusCounts }: { statusCounts: Record<string, number> }) {
  const stages = funnelStages(statusCounts);
  const top = stages[0]?.count ?? 0;
  if (top === 0) return null;

  return (
    <Card
      title="Where applications die"
      hint="Each bar counts applications that reached that stage or died past it. The right-hand number is what survived the previous stage."
    >
      <div className="flex flex-col gap-2">
        {stages.map((s) => (
          <div key={s.key} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-sm text-sub">{s.label}</span>
            <div className="h-6 flex-1 overflow-hidden rounded bg-well">
              <div
                className="flex h-full items-center rounded px-2"
                style={{
                  width: `${Math.max((s.count / top) * 100, s.count > 0 ? 6 : 0)}%`,
                  backgroundColor: s.key === 'offer' ? palette.good : palette.accent,
                  opacity: s.count === 0 ? 0.25 : 1 - stages.indexOf(s) * 0.13,
                }}
              >
                <span className="text-xs font-bold tabular-nums text-bg">{s.count}</span>
              </div>
            </div>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-sub">
              {s.pctOfPrev === null ? pct(100) : `${pct(s.pctOfPrev)} of prev`}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Conversion-to-human per bucket of one dimension. Sorted by rate, but rows
 *  under MIN_SEGMENT_N are dimmed — with 14 positive outcomes in the whole
 *  database, a 1-of-3 bucket is noise and must not read as a finding. */
function SegmentCard({ title, hint, rows, coverage, total }: {
  title: string;
  hint: string;
  rows: SegmentRow[];
  coverage?: number;
  total?: number;
}) {
  if (rows.length === 0) return null;
  const best = Math.max(1, ...rows.map((r) => r.rate));
  const missing = coverage !== undefined && total !== undefined ? total - coverage : 0;

  return (
    <Card title={title} hint={hint}>
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.bucket} className="flex items-center gap-3">
            <span
              className={`w-28 shrink-0 truncate text-sm ${r.unset ? 'italic text-sub/70' : 'text-sub'}`}
            >
              {r.bucket}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-well">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(r.rate / best) * 100}%`,
                  backgroundColor: palette.good,
                  opacity: r.lowN ? 0.35 : 1,
                }}
              />
            </div>
            <span
              className={`w-14 shrink-0 text-right text-sm font-bold tabular-nums ${
                r.lowN ? 'text-sub' : 'text-ink'
              }`}
            >
              {pct(r.rate)}
            </span>
            <span className="w-20 shrink-0 text-right text-xs tabular-nums text-sub">
              {r.advanced}/{r.total}
              {r.lowN ? ' ·low n' : ''}
            </span>
          </div>
        ))}
      </div>
      {missing > 0 && (
        <p className="mt-3 text-xs text-sub">
          {missing} of {total} applications have this field empty in Notion — they sit in
          the <span className="italic">(unset)</span> row. Backfill them and this chart
          gets sharper.
        </p>
      )}
    </Card>
  );
}

export default function ApplicationInsights({ insights }: { insights: AppsInsights }) {
  const { status_counts, segments, coverage, total } = insights;
  if (total === 0) return null;

  const weeks = weeklyRows(insights.weekly);
  const settled = resolvedConversion(weeks);
  const levels = segmentRows(segments.level);
  const tiers = segmentRows(segments.tier);
  const sources = segmentRows(segments.source);
  const companyTypes = segmentRows(segments.company_type);

  // A channel is "concentrated" when one source is nearly everything — the most
  // actionable fact on this page when it's true, and invisible in a bar chart of
  // a single bar, so it gets called out in words instead.
  const topSource = sources.reduce<SegmentRow | null>(
    (best, r) => (best === null || r.total > best.total ? r : best),
    null,
  );
  const concentrated = topSource && topSource.total / total >= 0.9 ? topSource : null;

  const stackData = weeks.map((w) => ({
    label: w.label,
    unresolved: w.unresolved,
    advanced: w.advanced,
    ghosted: w.ghosted,
    rejected: w.rejected,
    pending: w.pending,
  }));
  const unresolvedCount = weeks.filter((w) => w.unresolved).length;

  return (
    <>
      <FunnelCard statusCounts={status_counts} />

      {concentrated && (
        <section className="card border-l-2" style={{ borderLeftColor: palette.warn }}>
          <h2 className="section-title">Single channel of record</h2>
          <p className="text-sm text-sub">
            <span className="font-bold text-ink">
              {pct((concentrated.total / total) * 100)}
            </span>{' '}
            of all {total} applications came from{' '}
            <span className="font-bold text-ink">{concentrated.bucket}</span>, converting at{' '}
            <span className="font-bold text-ink">{pct(concentrated.rate)}</span>. Every other
            source in your schema is unused, so there is no comparison to draw yet — the
            fastest way to make this page more useful is to send applications through a
            second channel (referral, cold email, recruiter inbound) and let it build a
            track record against this one.
          </p>
        </section>
      )}

      <Card
        title="How each week's applications ended up"
        hint={
          unresolvedCount > 0
            ? `Cohorted by the week you applied. The ${unresolvedCount} most recent week(s) are faded — those applications are too new to have been ghosted yet, so their mix is not comparable.`
            : 'Cohorted by the week you applied.'
        }
      >
        <OutcomeStack data={stackData} series={OUTCOME_STYLE} />
        <div className="mt-3 flex flex-wrap gap-4">
          {OUTCOME_STYLE.map((s) => (
            <span key={s.key} className="flex items-center gap-2 text-xs text-sub">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
        {settled.resolved > 0 && (
          <p className="mt-3 text-xs text-sub">
            Across the {settled.resolved} applications that have actually resolved,{' '}
            <span className="font-bold text-ink">{settled.advanced}</span> reached a human —{' '}
            <span className="font-bold text-ink">{pct(settled.rate)}</span>. Rates below use
            all {total} applications, so they read slightly lower.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SegmentCard
          title="Conversion by level"
          hint={`Share of applications that reached a human. Rows under ${MIN_SEGMENT_N} applications are dimmed — too few to trust.`}
          rows={levels}
        />
        <SegmentCard
          title="Conversion by tier"
          hint="Whether aiming at better-known companies is costing you replies."
          rows={tiers}
        />
      </div>

      {companyTypes.length > 0 && (
        <SegmentCard
          title="Conversion by company type"
          hint="Startups vs enterprises vs agencies/middlemen."
          rows={companyTypes}
          coverage={coverage.company_type}
          total={total}
        />
      )}
    </>
  );
}
