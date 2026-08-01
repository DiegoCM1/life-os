// Pure derivations for the applications conversion charts. The API hands back
// raw Notion status counts; every rate shown on the page is computed here so the
// funnel definition stays in config/goals.ts and stays testable.

import {
  APPLICATION_OUTCOMES,
  APPLICATION_STAGES,
  MIN_SEGMENT_N,
  type OutcomeKey,
} from '@/config/goals';
import type { AppsInsights } from '@/lib/api';

export type Counts = Record<string, number>;

/** Statuses a week must be mostly free of before its outcome mix means anything.
 *  Applications sent days ago haven't had time to be ghosted — a week whose
 *  pending share is above this is right-censored and gets marked, not dropped. */
const UNRESOLVED_SHARE = 0.2;

const OUTCOME_OF: Record<string, OutcomeKey> = Object.fromEntries(
  (Object.entries(APPLICATION_OUTCOMES) as [OutcomeKey, readonly string[]][]).flatMap(
    ([key, statuses]) => statuses.map((s) => [s, key] as const),
  ),
);

/** Which outcome bucket a Notion status falls into. Unknown statuses (someone
 *  added an option in Notion) count as pending rather than vanishing. */
export function outcomeOf(status: string): OutcomeKey {
  return OUTCOME_OF[status] ?? 'pending';
}

export function sumOf(counts: Counts, statuses: readonly string[]): number {
  return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
}

export function totalOf(counts: Counts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

export type OutcomeTotals = Record<OutcomeKey, number>;

export function outcomeTotals(counts: Counts): OutcomeTotals {
  const out: OutcomeTotals = { advanced: 0, ghosted: 0, rejected: 0, pending: 0 };
  for (const [status, n] of Object.entries(counts)) out[outcomeOf(status)] += n;
  return out;
}

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  /** share of the top of the funnel (total applied) */
  pctOfTotal: number;
  /** share of the previous stage — where the drop actually happens */
  pctOfPrev: number | null;
};

export function funnelStages(statusCounts: Counts): FunnelStage[] {
  const total = totalOf(statusCounts);
  let prev: number | null = null;
  return APPLICATION_STAGES.map((stage) => {
    const count = stage.statuses === null ? total : sumOf(statusCounts, stage.statuses);
    const row: FunnelStage = {
      key: stage.key,
      label: stage.label,
      count,
      pctOfTotal: total > 0 ? (count / total) * 100 : 0,
      pctOfPrev: prev !== null && prev > 0 ? (count / prev) * 100 : null,
    };
    prev = count;
    return row;
  });
}

export type SegmentRow = {
  bucket: string;
  total: number;
  advanced: number;
  /** advanced ÷ resolved-or-not; the honest denominator is every application
   *  sent, because a pending one is not evidence of success either way */
  rate: number;
  /** true when the denominator is too small to read as signal */
  lowN: boolean;
  unset: boolean;
};

/** Conversion per bucket of one dimension, best rate first. Buckets below
 *  MIN_SEGMENT_N are kept (hiding them would hide the sample problem) but
 *  flagged so the UI can gray them out. */
export function segmentRows(
  buckets: Record<string, Counts> | undefined,
  minN = MIN_SEGMENT_N,
): SegmentRow[] {
  if (!buckets) return [];
  return Object.entries(buckets)
    .map(([bucket, counts]) => {
      const total = totalOf(counts);
      const advanced = outcomeTotals(counts).advanced;
      return {
        bucket,
        total,
        advanced,
        rate: total > 0 ? (advanced / total) * 100 : 0,
        lowN: total < minN,
        unset: bucket === '(unset)',
      };
    })
    .sort((a, b) => b.rate - a.rate || b.total - a.total);
}

export type WeekRow = OutcomeTotals & {
  weekStart: string;
  /** short label for the axis, e.g. "05-11" */
  label: string;
  total: number;
  /** too many still-open applications for this week's mix to mean anything */
  unresolved: boolean;
};

export function weeklyRows(weekly: AppsInsights['weekly']): WeekRow[] {
  return weekly.map((w) => {
    const totals = outcomeTotals(w.counts);
    const total = totalOf(w.counts);
    return {
      ...totals,
      weekStart: w.week_start,
      label: w.week_start.slice(5),
      total,
      unresolved: total > 0 && totals.pending / total >= UNRESOLVED_SHARE,
    };
  });
}

/** Headline rate over the weeks that have actually resolved — quoting the
 *  all-time rate including this week's untouched applications understates it. */
export function resolvedConversion(rows: WeekRow[]): {
  advanced: number;
  resolved: number;
  rate: number;
} {
  const settled = rows.filter((r) => !r.unresolved);
  const advanced = settled.reduce((s, r) => s + r.advanced, 0);
  const resolved = settled.reduce((s, r) => s + r.total, 0);
  return { advanced, resolved, rate: resolved > 0 ? (advanced / resolved) * 100 : 0 };
}
