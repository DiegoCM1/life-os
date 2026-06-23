import Link from 'next/link';
import type { Range } from '@/lib/range';
import { isoAddDays } from '@/lib/time';
import DayPicker from './DayPicker';

// Server-rendered day picker carried in the URL (?day=), mirroring the
// ?spiral= pattern so the dashboard stays fully server-rendered. Next is
// capped at today — there are no future days to edit.
export default function DayNav({ selectedDay, today, spiralRange }: {
  selectedDay: string;
  today: string;
  spiralRange: Range;
}) {
  const isToday = selectedDay >= today;

  const href = (day: string) => {
    const params = new URLSearchParams();
    if (day !== today) params.set('day', day);
    if (spiralRange !== 'month') params.set('spiral', spiralRange);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  };

  const arrow = 'flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-well text-lg leading-none';

  return (
    <div className="flex items-center gap-2">
      {!isToday && (
        <Link href={href(today)} className="mr-1 text-xs uppercase tracking-widest text-sub hover:text-ink">
          Today
        </Link>
      )}
      <Link href={href(isoAddDays(selectedDay, -1))} aria-label="previous day" className={arrow}>
        ‹
      </Link>
      <DayPicker selectedDay={selectedDay} today={today} spiralRange={spiralRange} />
      {isToday ? (
        <span aria-hidden className={`${arrow} opacity-30`}>›</span>
      ) : (
        <Link href={href(isoAddDays(selectedDay, 1))} aria-label="next day" className={arrow}>
          ›
        </Link>
      )}
    </div>
  );
}
