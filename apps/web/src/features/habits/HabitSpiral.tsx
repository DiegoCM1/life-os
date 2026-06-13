// Spiral habit tracker (paper habit-wheel style): one concentric ring per
// habit, one cell per day of the month radiating clockwise from 12 o'clock.
// A done check-in fills its cell green. Server-rendered inline SVG — no
// charting lib, zero client JS (brief: simple visuals stay CSS/inline SVG).

import { GOALS } from '@/config/goals';
import type { MonthLog } from '@/lib/api';

const SIZE = 480;
const C = SIZE / 2;
const INNER_R = 66;
const OUTER_R = 198;
const LABEL_R = 214;
const RING_GAP = 3;
const ANGLE_GAP_DEG = 1.6;

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180; // 0° = 12 o'clock, clockwise
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

/** Annular sector ("square" cell on a polar grid) between radii r0<r1, angles a0<a1. */
function cellPath(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(x0)} ${f(y0)}`,
    `A ${f(r1)} ${f(r1)} 0 0 1 ${f(x1)} ${f(y1)}`,
    `L ${f(x2)} ${f(y2)}`,
    `A ${f(r0)} ${f(r0)} 0 0 0 ${f(x3)} ${f(y3)}`,
    'Z',
  ].join(' ');
}

export default function HabitSpiral({ monthLogs, today }: {
  monthLogs: MonthLog[];
  today: string; // YYYY-MM-DD in dashboard tz
}) {
  const [y, m, todayDay] = today.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const habits = GOALS.filter((g) => g.type === 'toggle');

  const doneByGoal = new Map<string, Set<number>>(habits.map((g) => [g.id, new Set()]));
  for (const log of monthLogs) {
    if (log.done) doneByGoal.get(log.goal_id)?.add(Number(log.log_date.slice(8, 10)));
  }

  const ringW = (OUTER_R - INNER_R) / habits.length - RING_GAP;
  const anglePerDay = 360 / daysInMonth;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-[480px]"
      role="img"
      aria-label="Monthly habit spiral"
    >
      {/* today wedge highlight behind the grid */}
      <path
        d={cellPath(
          INNER_R - 6,
          OUTER_R + 6,
          (todayDay - 1) * anglePerDay,
          todayDay * anglePerDay
        )}
        className="fill-accent/10"
      />

      {habits.map((habit, ring) => {
        const r0 = INNER_R + ring * (ringW + RING_GAP);
        const r1 = r0 + ringW;
        const done = doneByGoal.get(habit.id) ?? new Set<number>();
        return Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const a0 = i * anglePerDay + ANGLE_GAP_DEG / 2;
          const a1 = (i + 1) * anglePerDay - ANGLE_GAP_DEG / 2;
          const cls = done.has(day)
            ? 'fill-good'
            : day < todayDay
              ? 'fill-edge/50'
              : day === todayDay
                ? 'fill-well stroke-accent/60'
                : 'fill-well stroke-edge';
          return (
            <path
              key={`${habit.id}-${day}`}
              d={cellPath(r0, r1, a0, a1)}
              className={cls}
              strokeWidth={1}
            />
          );
        });
      })}

      {/* day numbers around the rim */}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const [x, yy] = polar(LABEL_R, (i + 0.5) * anglePerDay);
        return (
          <text
            key={day}
            x={x.toFixed(1)}
            y={yy.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="central"
            className={`text-[9px] tabular-nums ${day === todayDay ? 'fill-accent font-bold' : 'fill-sub'}`}
          >
            {day}
          </text>
        );
      })}

      {/* center: month progress */}
      <text x={C} y={C - 6} textAnchor="middle" className="fill-ink text-2xl font-bold tabular-nums">
        {todayDay}
      </text>
      <text x={C} y={C + 16} textAnchor="middle" className="fill-sub text-[11px]">
        of {daysInMonth}
      </text>
    </svg>
  );
}
