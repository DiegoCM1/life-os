import { describe, expect, it } from 'vitest';
import {
  funnelStages,
  outcomeOf,
  outcomeTotals,
  resolvedConversion,
  segmentRows,
  weeklyRows,
} from './applicationStats';

// Mirrors the real Notion database so the numbers below double as documentation
// of what the page is claiming.
const STATUS_COUNTS = {
  Applied: 41,
  Interviewing: 3,
  'Dead - Application rejected': 43,
  'Dead - Ghosted': 309,
  'Dead - After HR': 10,
  'Dead - After technical interview': 1,
};

describe('outcomeOf', () => {
  it('maps every known status to its bucket', () => {
    expect(outcomeOf('Dead - Ghosted')).toBe('ghosted');
    expect(outcomeOf('Dead - After HR')).toBe('advanced');
    expect(outcomeOf('Offer')).toBe('advanced');
    expect(outcomeOf('Applied')).toBe('pending');
  });

  it('treats an unrecognised status as pending rather than dropping it', () => {
    // Someone adds a Status option in Notion — it must not silently vanish from
    // the totals, which would make every rate on the page wrong.
    expect(outcomeOf('Take-home sent')).toBe('pending');
  });
});

describe('outcomeTotals', () => {
  it('partitions the whole database with nothing lost', () => {
    const t = outcomeTotals(STATUS_COUNTS);
    expect(t).toEqual({ advanced: 14, ghosted: 309, rejected: 43, pending: 41 });
    expect(t.advanced + t.ghosted + t.rejected + t.pending).toBe(407);
  });
});

describe('funnelStages', () => {
  const stages = funnelStages(STATUS_COUNTS);
  const by = (k: string) => stages.find((s) => s.key === k)!;

  it('starts at the full total', () => {
    expect(by('applied').count).toBe(407);
    expect(by('applied').pctOfPrev).toBeNull();
  });

  it('counts a stage as reached-or-died-past', () => {
    // rejected(43) + afterHR(10) + afterTech(1) + interviewing(3)
    expect(by('replied').count).toBe(57);
    expect(by('human').count).toBe(14);
    expect(by('offer').count).toBe(0);
  });

  it('never increases down the funnel', () => {
    const counts = stages.map((s) => s.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('reports the drop relative to the previous stage', () => {
    expect(by('human').pctOfPrev).toBeCloseTo((14 / 57) * 100, 5);
  });
});

describe('segmentRows', () => {
  const rows = segmentRows({
    Mid: { 'Dead - Ghosted': 234, 'Dead - After HR': 5, Applied: 33 },
    Lead: { 'Dead - Ghosted': 29, 'Dead - After HR': 4, Applied: 4 },
    Junior: { 'Dead - After HR': 1, 'Dead - Ghosted': 3 },
  });

  it('sorts by conversion rate, best first', () => {
    expect(rows.map((r) => r.bucket)).toEqual(['Junior', 'Lead', 'Mid']);
  });

  it('flags buckets too small to trust', () => {
    expect(rows.find((r) => r.bucket === 'Junior')!.lowN).toBe(true);
    expect(rows.find((r) => r.bucket === 'Mid')!.lowN).toBe(false);
  });

  it('keeps low-n buckets instead of hiding the sample problem', () => {
    expect(rows).toHaveLength(3);
  });

  it('divides by every application sent, not just the resolved ones', () => {
    const lead = rows.find((r) => r.bucket === 'Lead')!;
    expect(lead.total).toBe(37);
    expect(lead.rate).toBeCloseTo((4 / 37) * 100, 5);
  });
});

describe('weeklyRows', () => {
  const rows = weeklyRows([
    { week_start: '2026-05-11', counts: { 'Dead - Ghosted': 17, 'Dead - After HR': 1 } },
    { week_start: '2026-07-27', counts: { Applied: 10 } },
  ]);

  it('marks a week that is still mostly open as unresolved', () => {
    // Nothing sent last week has had time to be ghosted — its mix is not
    // comparable to a settled week and the UI must not present it as one.
    expect(rows[1].unresolved).toBe(true);
    expect(rows[0].unresolved).toBe(false);
  });

  it('labels weeks for the axis', () => {
    expect(rows[0].label).toBe('05-11');
  });
});

describe('resolvedConversion', () => {
  it('ignores unresolved weeks so the headline rate is not diluted', () => {
    const rows = weeklyRows([
      { week_start: '2026-05-11', counts: { 'Dead - Ghosted': 17, 'Dead - After HR': 1 } },
      { week_start: '2026-07-27', counts: { Applied: 10 } },
    ]);
    const r = resolvedConversion(rows);
    expect(r.resolved).toBe(18);
    expect(r.advanced).toBe(1);
    expect(r.rate).toBeCloseTo((1 / 18) * 100, 5);
  });
});
