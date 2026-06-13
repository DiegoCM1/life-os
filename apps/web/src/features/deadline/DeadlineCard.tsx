'use client';

import { useEffect, useState } from 'react';
import { DEADLINE_HOUR } from '@/config/goals';
import { nowPartsMx } from '@/lib/time';

const MOOD_CLASSES: Record<string, { card: string; clock: string }> = {
  calm: { card: 'border-edge', clock: 'text-ink' },
  done: { card: 'border-good', clock: 'text-good' },
  loud: { card: 'border-bad bg-bad-dim animate-pulsebad', clock: 'text-bad' },
  missed: { card: 'border-bad bg-bad-dim', clock: 'text-bad' },
};

// Ticking 11:00 AM countdown. Server provides counts; the clock runs locally
// (always in dashboard tz, not device tz). Escalates as the deadline nears.
export default function DeadlineCard({ todayCount, target }: {
  todayCount: number | null;
  target: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const { hour, minute, second } = nowPartsMx();
      setSecondsLeft(DEADLINE_HOUR * 3600 - (hour * 3600 + minute * 60 + second));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = todayCount === null ? null : Math.max(0, target - todayCount);
  const done = remaining === 0;
  const past = secondsLeft !== null && secondsLeft <= 0;

  let mood = 'calm';
  if (done) mood = 'done';
  else if (past) mood = 'missed';
  else if (secondsLeft !== null && secondsLeft < 2 * 3600) mood = 'loud';

  function clock(total: number): string {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <section className={`card text-center transition-colors duration-500 ${MOOD_CLASSES[mood].card}`}>
      <div
        className={`text-5xl font-bold leading-tight tabular-nums ${MOOD_CLASSES[mood].clock}`}
        suppressHydrationWarning
      >
        {secondsLeft === null ? '–:––:––' : past ? 'PAST 11:00' : clock(secondsLeft)}
      </div>
      <div className="mt-1 text-lg">
        {todayCount === null ? (
          <span className="text-sub">Notion unreachable</span>
        ) : done ? (
          <span>Applications done · {todayCount}/{target}</span>
        ) : (
          <span>
            <strong>{remaining}</strong> application{remaining === 1 ? '' : 's'} left · {todayCount}/{target}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-sub">daily deadline 11:00 AM</div>
    </section>
  );
}
