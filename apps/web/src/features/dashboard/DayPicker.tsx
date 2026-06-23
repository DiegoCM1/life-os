'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Range } from '@/lib/range';
import { formatDay, isoAddDays } from '@/lib/time';

// The clickable date label in DayNav: tapping it opens the OS calendar
// (native <input type="date">) so you can jump straight to any day instead
// of stepping through the arrows. Capped at today — no future days to edit.
export default function DayPicker({ selectedDay, today, spiralRange }: {
  selectedDay: string;
  today: string;
  spiralRange: Range;
}) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  function go(day: string) {
    const params = new URLSearchParams();
    if (day !== today) params.set('day', day);
    if (spiralRange !== 'month') params.set('spiral', spiralRange);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : '/');
  }

  return (
    <button
      type="button"
      onClick={() => ref.current?.showPicker?.()}
      className="relative min-w-28 text-center text-sm tabular-nums text-sub hover:text-ink"
    >
      {selectedDay >= today
        ? 'Today'
        : selectedDay === isoAddDays(today, -1)
          ? 'Yesterday'
          : formatDay(selectedDay)}
      <input
        ref={ref}
        type="date"
        max={today}
        value={selectedDay}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="pointer-events-none absolute inset-0 opacity-0"
        tabIndex={-1}
        aria-label="Pick a day"
      />
    </button>
  );
}
