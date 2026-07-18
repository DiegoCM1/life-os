import { describe, it, expect } from 'vitest';
import {
  formatClock,
  isLate,
  isoAddDays,
  minutesOfDayMx,
  mondayOfWeekMx,
  mxDateOf,
  parseDay,
} from '@/lib/time';

// TIMEZONE is fixed (America/Mexico_City, UTC-6, no DST since 2022), so these are
// fully deterministic regardless of the machine's clock/timezone.

describe('isoAddDays', () => {
  it('adds and subtracts days', () => {
    expect(isoAddDays('2026-06-13', 1)).toBe('2026-06-14');
    expect(isoAddDays('2026-06-13', -1)).toBe('2026-06-12');
  });
  it('crosses month and year boundaries', () => {
    expect(isoAddDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(isoAddDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('mondayOfWeekMx', () => {
  it('returns the Monday of the containing week', () => {
    expect(mondayOfWeekMx('2026-06-13')).toBe('2026-06-08'); // Sat → that Monday
    expect(mondayOfWeekMx('2026-06-14')).toBe('2026-06-08'); // Sun → same Monday
    expect(mondayOfWeekMx('2026-06-15')).toBe('2026-06-15'); // Mon → itself
  });
});

describe('parseDay', () => {
  const today = '2026-06-13';
  it('defaults to today when missing or invalid', () => {
    expect(parseDay(undefined, today)).toBe(today);
    expect(parseDay('garbage', today)).toBe(today);
    expect(parseDay('2026-13-40', today)).toBe(today);
  });
  it('rejects future dates but keeps valid past dates', () => {
    expect(parseDay('2026-06-20', today)).toBe(today);
    expect(parseDay('2026-06-10', today)).toBe('2026-06-10');
  });
});

describe('formatClock', () => {
  it('formats minutes-since-midnight on a 12h clock', () => {
    expect(formatClock(0)).toBe('12:00 AM');
    expect(formatClock(480)).toBe('8:00 AM');
    expect(formatClock(750)).toBe('12:30 PM');
    expect(formatClock(1439)).toBe('11:59 PM');
  });
});

describe('minutesOfDayMx / mxDateOf', () => {
  it('converts a UTC instant to MX minutes-of-day', () => {
    expect(minutesOfDayMx('2026-06-13T14:01:00+00:00')).toBe(481); // 08:01 MX
  });
  it('reports the MX calendar date of a late-UTC instant', () => {
    expect(mxDateOf('2026-06-14T05:59:00+00:00')).toBe('2026-06-13'); // 23:59 MX, prev day
  });
});

describe('isLate', () => {
  it('is strict at the deadline boundary', () => {
    expect(isLate('2026-06-13', '2026-06-13T14:00:00+00:00', 8)).toBe(false); // 08:00 exactly
    expect(isLate('2026-06-13', '2026-06-13T14:01:00+00:00', 8)).toBe(true); // 08:01
  });
  it('is never late with missing inputs', () => {
    expect(isLate('2026-06-13', null, 8)).toBe(false);
    expect(isLate('2026-06-13', '2026-06-13T14:01:00+00:00', undefined)).toBe(false);
  });
});
