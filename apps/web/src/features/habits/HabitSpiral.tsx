'use client';

// Spiral habit tracker (paper habit-wheel style): one concentric ring per
// tracked thing (5 rings: toggles, deep work, applications), segments
// radiating clockwise from 12 o'clock. Range-aware:
//   week  → 7 day cells, labeled by weekday
//   month → one cell per day of the current month (default)
//   year  → 52 week cells
// Cell fill is a 0..1 fraction: binary habits are full/empty; target-based
// rings (deep work hours, applications) shade with partial progress.
// Inline SVG — no charting lib. Client-side only for the hover tooltip, which
// shows the cell's ring/date/status and any saved note.

import { useRef, useState } from 'react';
import type { Range } from '@/lib/range';
import { isoAddDays, mondayOfWeekMx } from '@/lib/time';

export type SpiralRing = {
  id: string;
  label: string;
  /** date → 0..1 progress (missing = 0) */
  fraction: Map<string, number>;
  /** dates where the (full) completion was logged after the deadline */
  lateDates?: Set<string>;
  /** dates excused by a Tregua (activity or whole-day) — rendered purple */
  treguaDates?: Set<string>;
  /** date → saved note, shown in the hover tooltip when present */
  notes?: Map<string, string>;
};

const SIZE = 560;
const C = SIZE / 2;
const INNER_R = 64;
const OUTER_R = 246;
const LABEL_R = 262;
const RING_GAP = 3;

// empty → dim → mid → full progress
const GREEN_SCALE = ['#1d4732', '#2a8a55', '#3ddc84'];
// late completions render amber instead of green (same --warn hue)
const AMBER_SCALE = ['#5a4410', '#c78a14', '#ffb020'];
// Tregua (excused) cells render solid purple (same --tregua hue)
const TREGUA_COLOR = '#a855f7';

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
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${f(x0)} ${f(y0)}`,
    `A ${f(r1)} ${f(r1)} 0 ${large} 1 ${f(x1)} ${f(y1)}`,
    `L ${f(x2)} ${f(y2)}`,
    `A ${f(r0)} ${f(r0)} 0 ${large} 0 ${f(x3)} ${f(y3)}`,
    'Z',
  ].join(' ');
}

type Segment = {
  key: string;
  label: string; // rim label ('' to hide)
  isCurrent: boolean;
  isSelected: boolean; // the day being viewed/edited (when in the past)
  /** 0..1 fill for one ring's fraction map */
  fillFor: (fraction: Map<string, number>) => number;
};

function weekdayIndexMx(iso: string): number {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
}

function buildSegments(range: Range, today: string, selectedDay: string): Segment[] {
  if (range === 'week') {
    // The current calendar week, Mon→Sun. Upcoming days simply have no logs yet,
    // so they render empty (rather than a rolling window that pulls in last
    // week's same-weekday cells and looks like the future is already done).
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monday = mondayOfWeekMx(today);
    return Array.from({ length: 7 }, (_, i) => {
      const date = isoAddDays(monday, i);
      return {
        key: date,
        label: labels[i],
        isCurrent: date === today,
        isSelected: date === selectedDay,
        fillFor: (fraction) => fraction.get(date) ?? 0,
      };
    });
  }

  if (range === 'year') {
    const thisMonday = isoAddDays(today, -weekdayIndexMx(today));
    return Array.from({ length: 52 }, (_, i) => {
      const monday = isoAddDays(thisMonday, -7 * (51 - i));
      const sunday = isoAddDays(monday, 6);
      const isMonthStart = Number(monday.slice(8, 10)) <= 7;
      return {
        key: monday,
        label: isMonthStart
          ? new Date(`${monday}T12:00:00Z`).toLocaleString('en', { month: 'short', timeZone: 'UTC' })
          : '',
        isCurrent: i === 51,
        isSelected: selectedDay >= monday && selectedDay <= sunday,
        fillFor: (fraction) => {
          let sum = 0;
          for (let d = 0; d < 7; d++) sum += fraction.get(isoAddDays(monday, d)) ?? 0;
          return sum / 7;
        },
      };
    });
  }

  // month (default): one cell per day of the current month
  const [y, m, todayDay] = today.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const prefix = today.slice(0, 8);
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${prefix}${String(day).padStart(2, '0')}`;
    return {
      key: date,
      label: String(day),
      isCurrent: day === todayDay,
      isSelected: date === selectedDay,
      fillFor: (fraction) => fraction.get(date) ?? 0,
    };
  });
}

function cellFill(fill: number, isPast: boolean, isCurrent: boolean, late: boolean, tregua: boolean): {
  className?: string;
  fill?: string;
} {
  if (tregua) return { fill: TREGUA_COLOR };
  if (fill > 0) {
    const scale = late ? AMBER_SCALE : GREEN_SCALE;
    return { fill: scale[fill <= 0.4 ? 0 : fill < 1 ? 1 : 2] };
  }
  if (isCurrent) return { className: 'fill-well stroke-accent/60' };
  return { className: isPast ? 'fill-edge/50' : 'fill-well stroke-edge' };
}

/** Friendly cell date for the tooltip. Year cells span a week, so label the start. */
function formatCellDate(key: string, range: Range): string {
  const d = new Date(`${key}T12:00:00Z`);
  if (range === 'year') {
    return `Week of ${d.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  }
  return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

type Tip = { x: number; y: number; label: string; date: string; status: string; note?: string };

export default function HabitSpiral({ rings, today, range, selectedDay }: {
  rings: SpiralRing[];
  today: string;
  range: Range;
  selectedDay: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const segments = buildSegments(range, today, selectedDay);
  const n = segments.length;
  const anglePer = 360 / n;
  const angleGap = Math.min(1.6, anglePer * 0.15);
  const ringW = (OUTER_R - INNER_R) / rings.length - RING_GAP;
  const currentIndex = segments.findIndex((s) => s.isCurrent);
  // Pink marker for a past day under review (today keeps its blue marker).
  const isPastView = selectedDay < today;
  const selectedIndex = isPastView ? segments.findIndex((s) => s.isSelected) : -1;

  const center =
    range === 'week'
      ? { big: segments[currentIndex]?.label ?? '', small: 'this week' }
      : range === 'year'
        ? {
            big: new Date(`${today}T12:00:00Z`).toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
            small: today.slice(0, 4),
          }
        : { big: String(Number(today.slice(8, 10))), small: `of ${n}` };

  return (
    <div ref={containerRef} className="relative w-full max-w-[560px]">
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Habit spiral (${range})`}
    >
      {/* current-period wedge highlight behind the grid */}
      {currentIndex >= 0 && (
        <path
          d={cellPath(INNER_R - 6, OUTER_R + 6, currentIndex * anglePer, (currentIndex + 1) * anglePer)}
          className="fill-accent/10"
        />
      )}

      {/* selected past-day wedge highlight (pink) */}
      {selectedIndex >= 0 && (
        <path
          d={cellPath(INNER_R - 6, OUTER_R + 6, selectedIndex * anglePer, (selectedIndex + 1) * anglePer)}
          className="fill-[#ec4899]/15"
        />
      )}

      {rings.map((ring, ringIndex) => {
        const r0 = INNER_R + ringIndex * (ringW + RING_GAP);
        const r1 = r0 + ringW;
        return segments.map((seg, i) => {
          const a0 = i * anglePer + angleGap / 2;
          const a1 = (i + 1) * anglePer - angleGap / 2;
          const isPast = currentIndex >= 0 && i < currentIndex;
          const late = ring.lateDates?.has(seg.key) ?? false;
          const tregua = ring.treguaDates?.has(seg.key) ?? false;
          const fillVal = seg.fillFor(ring.fraction);
          const style = cellFill(fillVal, isPast, seg.isCurrent, late, tregua);
          const isSel = isPastView && seg.isSelected;
          const note = ring.notes?.get(seg.key);
          const status = tregua
            ? 'Tregua'
            : fillVal >= 1
              ? late
                ? 'Done · late'
                : 'Done'
              : fillVal > 0
                ? 'Partial'
                : isPast || seg.isCurrent
                  ? 'Not done'
                  : '';
          const showTip = (e: React.MouseEvent) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setTip({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              label: ring.label,
              date: formatCellDate(seg.key, range),
              status,
              note,
            });
          };
          return (
            <path
              key={`${ring.id}-${seg.key}`}
              d={cellPath(r0, r1, a0, a1)}
              className={`${style.className ?? ''} ${isSel ? 'stroke-[#ec4899]' : ''}`}
              fill={style.fill}
              strokeWidth={isSel ? 2 : 1}
              onMouseEnter={showTip}
              onMouseMove={showTip}
              onMouseLeave={() => setTip(null)}
            />
          );
        });
      })}

      {/* rim labels */}
      {segments.map((seg, i) => {
        if (!seg.label) return null;
        const [x, yy] = polar(LABEL_R, (i + 0.5) * anglePer);
        return (
          <text
            key={`label-${seg.key}`}
            x={x.toFixed(1)}
            y={yy.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="central"
            className={`tabular-nums ${range === 'month' ? 'text-[10px]' : 'text-[11px]'} ${
              isPastView && seg.isSelected
                ? 'fill-[#ec4899] font-bold'
                : seg.isCurrent
                  ? 'fill-accent font-bold'
                  : 'fill-sub'
            }`}
          >
            {seg.label}
          </text>
        );
      })}

      {/* center summary */}
      <text x={C} y={C - 6} textAnchor="middle" className="fill-ink text-2xl font-bold tabular-nums">
        {center.big}
      </text>
      <text x={C} y={C + 16} textAnchor="middle" className="fill-sub text-[11px]">
        {center.small}
      </text>
    </svg>

      {tip && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-lg border border-edge bg-card px-3 py-2 shadow-xl"
          style={{ left: tip.x, top: tip.y - 12 }}
        >
          <div className="text-xs font-bold text-ink">{tip.label}</div>
          <div className="mt-0.5 text-[10px] text-sub">
            {tip.date}
            {tip.status && ` · ${tip.status}`}
          </div>
          {tip.note && (
            <div className="mt-1.5 whitespace-pre-wrap border-t border-edge pt-1.5 text-xs text-ink/90">
              {tip.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
