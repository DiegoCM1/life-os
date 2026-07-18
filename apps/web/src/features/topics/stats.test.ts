import { describe, it, expect } from 'vitest';
import type { MonthLog } from '@/lib/api';
import {
  dateWindow,
  doneDates,
  habitMessage,
  habitStats,
  wakeStats,
  weekdayIndex,
  weekdayTotals,
  weeklyTotals,
} from '@/features/topics/stats';

const posted = (log_date: string, done: boolean): MonthLog => ({
  log_date,
  goal_id: 'posted',
  done,
  value: null,
  done_at: null,
  note: null,
  tregua: false,
});

// A wake_up row whose done_at lands at `minutesMx` on the same MX day (UTC = MX+6h).
const wake = (log_date: string, minutesMx: number): MonthLog => {
  const utc = minutesMx + 360;
  const hh = String(Math.floor(utc / 60)).padStart(2, '0');
  const mm = String(utc % 60).padStart(2, '0');
  return {
    log_date,
    goal_id: 'wake_up',
    done: true,
    value: null,
    done_at: `${log_date}T${hh}:${mm}:00+00:00`,
    note: null,
    tregua: false,
  };
};

describe('dateWindow / weekdayIndex', () => {
  it('lists the window oldest-first, ending today', () => {
    expect(dateWindow('2026-06-13', 3)).toEqual(['2026-06-11', '2026-06-12', '2026-06-13']);
  });
  it('indexes weekdays with Monday = 0', () => {
    expect(weekdayIndex('2026-06-08')).toBe(0); // Mon
    expect(weekdayIndex('2026-06-13')).toBe(5); // Sat
  });
});

describe('doneDates', () => {
  it('collects only done dates for the given goal', () => {
    const logs: MonthLog[] = [
      posted('2026-06-08', true),
      posted('2026-06-09', false),
      { ...posted('2026-06-10', true), goal_id: 'calisthenics' },
    ];
    expect(doneDates(logs, 'posted')).toEqual(new Set(['2026-06-08']));
  });
});

describe('habitStats', () => {
  // done: 06-08 (isolated), then 06-11..06-13 (3 in a row ending today).
  const logs: MonthLog[] = [
    posted('2026-06-08', true),
    posted('2026-06-09', false),
    posted('2026-06-11', true),
    posted('2026-06-12', true),
    posted('2026-06-13', true),
  ];
  const stats = habitStats(logs, 'posted', '2026-06-13', 7);

  it('counts the current streak ending today', () => {
    expect(stats.currentStreak).toBe(3);
  });
  it('finds the longest run within the window', () => {
    expect(stats.longestStreak).toBe(3);
  });
  it('counts done-in-range and the completion rate', () => {
    expect(stats.doneInRange).toBe(4); // 06-08, 06-11, 06-12, 06-13
    expect(stats.ratePercent).toBe(57); // round(4/7*100)
  });
});

describe('habitMessage', () => {
  it('shows neutral build-up copy when fewer than 3 days are logged', () => {
    const done = new Set(['2026-06-12', '2026-06-13']);
    const m = habitMessage(done, '2026-06-13', 30, 7, 2, 'posted');
    expect(m.tone).toBe('default');
    expect(m.header).toBe('Posting rhythm');
  });

  it('reads a strong, rising rhythm as good', () => {
    const done = new Set<string>();
    for (let i = 0; i < 7; i++) done.add(`2026-06-${String(13 - i).padStart(2, '0')}`); // last 7 all done
    const m = habitMessage(done, '2026-06-13', 30, 90, 7, 'calisthenics');
    expect(m.tone).toBe('good');
    expect(m.header).toBe('Training rhythm');
  });

  it('reads a weak, falling rhythm as bad', () => {
    const done = new Set(['2026-05-30', '2026-05-31', '2026-06-01']); // all in the prior week
    const m = habitMessage(done, '2026-06-13', 30, 30, 0, 'posted');
    expect(m.tone).toBe('bad');
  });
});

describe('wakeStats', () => {
  const logs: MonthLog[] = [
    wake('2026-06-08', 450), // 07:30
    wake('2026-06-09', 455),
    wake('2026-06-10', 460),
    wake('2026-06-11', 445),
    wake('2026-06-12', 450),
    { ...wake('2026-06-13', 450), done_at: '2026-06-14T12:00:00+00:00' }, // back-fill → excluded
    { ...wake('2026-06-15', 450), tregua: true }, // excused → excluded
  ];
  const stats = wakeStats(logs);

  it('samples only valid, same-day, non-tregua mornings', () => {
    expect(stats.daysLogged).toBe(5);
  });
  it('computes the typical wake time and spread', () => {
    expect(stats.medianMinutes).toBe(450);
    expect(stats.stdevMinutes).toBe(5);
    expect(stats.onTimePercent).toBe(100);
  });
  it('reads a tight, early rhythm as good', () => {
    expect(stats.message.tone).toBe('good');
  });
});

describe('series builders', () => {
  const valueOf = (d: string) => (['2026-06-08', '2026-06-13'].includes(d) ? 1 : 0);

  it('weekdayTotals buckets by weekday (Mon..Sun)', () => {
    const out = weekdayTotals('2026-06-13', 7, valueOf);
    expect(out.find((x) => x.label === 'Mon')?.value).toBe(1); // 06-08
    expect(out.find((x) => x.label === 'Sat')?.value).toBe(1); // 06-13
    expect(out.find((x) => x.label === 'Tue')?.value).toBe(0);
  });

  it('weeklyTotals buckets by Monday-start week', () => {
    expect(weeklyTotals('2026-06-13', 7, valueOf)).toEqual([
      { label: '06/01', value: 0 },
      { label: '06/08', value: 2 },
    ]);
  });
});
