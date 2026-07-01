'use client';

import { useEffect, useState } from 'react';
import { DEADLINES, VICTORY_LINES } from '@/config/goals';
import { nowPartsMx } from '@/lib/time';
import { rgb } from '@/design/tokens';
import Typewriter from './Typewriter';

// Two-stage daily deadline card (always in dashboard tz, not device tz):
//   1. applications by 9:00  → once done, advances to
//   2. post + interview prep by 19:00 → once done,
//   victory mode: green + rotating motivational line.
// While a stage is live the card fades gray → red as its deadline approaches.

const GRAY = rgb.sub; // --sub
const RED = rgb.bad; // --bad

function lerpColor(t: number): string {
  // t: 1 = lots of time (gray) → 0 = deadline (red)
  const c = GRAY.map((g, i) => Math.round(g + (RED[i] - g) * (1 - t)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function clock(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DeadlineCard({ todayCount, target, postedDone, prepDone }: {
  todayCount: number | null;
  target: number;
  postedDone: boolean;
  prepDone: boolean;
}) {
  const [nowSeconds, setNowSeconds] = useState<number | null>(null);
  // Lazy random start so the same line doesn't greet every victory. Safe for
  // SSR: the Typewriter renders empty until its client timer ticks, so the
  // differing initial index never reaches the DOM during hydration.
  const [lineIndex, setLineIndex] = useState(() =>
    Math.floor(Math.random() * VICTORY_LINES.length)
  );

  useEffect(() => {
    const tick = () => {
      const { hour, minute, second } = nowPartsMx();
      setNowSeconds(hour * 3600 + minute * 60 + second);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setLineIndex((i) => (i + 1) % VICTORY_LINES.length), 9_000);
    return () => clearInterval(id);
  }, []);

  const appsRemaining = todayCount === null ? null : Math.max(0, target - todayCount);
  const appsDone = appsRemaining === 0;
  const eveningTasksLeft = [
    !postedDone && 'Post',
    !prepDone && 'Interview prep',
  ].filter(Boolean) as string[];
  const eveningDone = eveningTasksLeft.length === 0;

  // ---------- victory: both stages cleared ----------
  if (appsDone && eveningDone) {
    return (
      <section className="card border-good bg-good-dim text-center shadow-glow-good">
        <div className="text-4xl font-bold leading-tight text-good text-glow">DAY WON</div>
        <div className="mt-2 min-h-[3.5rem] text-lg italic">
          <Typewriter text={VICTORY_LINES[lineIndex]} />
        </div>
        <div className="mt-1 text-xs text-sub">
          applications {todayCount}/{target} · posted · prepped
        </div>
      </section>
    );
  }

  // ---------- pick the live stage ----------
  const stage = !appsDone
    ? {
        hour: DEADLINES.applications.hour,
        title:
          todayCount === null
            ? 'Notion unreachable'
            : `${appsRemaining} application${appsRemaining === 1 ? '' : 's'} left · ${todayCount}/${target}`,
        next: `then ${DEADLINES.evening.label} by ${DEADLINES.evening.hour - 12}:00 PM`,
      }
    : {
        hour: DEADLINES.evening.hour,
        title: `${eveningTasksLeft.join(' + ')} left`,
        next: `applications done ✓ ${todayCount}/${target}`,
      };

  const deadlineSeconds = stage.hour * 3600;
  const secondsLeft = nowSeconds === null ? null : deadlineSeconds - nowSeconds;
  const past = secondsLeft !== null && secondsLeft <= 0;

  // gray → red over the final 4 hours; pulse inside the last hour
  const t = secondsLeft === null ? 1 : Math.min(1, Math.max(0, secondsLeft / (4 * 3600)));
  const color = past ? `rgb(${RED.join(', ')})` : lerpColor(t);
  const pulse = !past && secondsLeft !== null && secondsLeft < 3600;

  const deadlineLabel =
    stage.hour < 12 ? `${stage.hour}:00 AM` : `${stage.hour - 12}:00 PM`;

  return (
    <section
      className={`card text-center transition-colors duration-500 ${pulse ? 'animate-pulsebad' : ''} ${past ? 'bg-bad-dim' : ''}`}
      style={{ borderColor: color }}
    >
      <div
        className="readout text-5xl font-bold leading-tight"
        style={{ color, textShadow: `0 0 14px ${color}66` }}
        suppressHydrationWarning
      >
        {secondsLeft === null ? '–:––:––' : past ? `PAST ${deadlineLabel}` : clock(secondsLeft)}
      </div>
      <div className="mt-1 text-lg">{stage.title}</div>
      <div className="mt-1 text-xs text-sub">
        deadline {deadlineLabel} · {stage.next}
      </div>
    </section>
  );
}
