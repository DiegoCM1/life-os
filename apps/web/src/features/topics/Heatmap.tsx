// GitHub-style calendar heatmap — the canonical pattern view for daily
// behavior: columns are weeks, rows are weekdays, intensity is the day's
// value. Weekday habits show up as solid rows; fading months show up as
// fading columns. Server-rendered inline SVG, zero client JS.

import { isoAddDays } from '@/lib/time';
import { palette, scales } from '@/design/tokens';
import { dateWindow, weekdayIndex } from './stats';

const CELL = 13;
const GAP = 3;
const LEFT_PAD = 30; // weekday labels
const TOP_PAD = 16; // month labels
const ROW_LABELS = ['Mon', 'Wed', 'Fri'];

// well → dim → mid → bright (intensity buckets above zero)
const SCALE = scales.heat;

function colorFor(value: number, max: number): string {
  if (value <= 0) return SCALE[0];
  const t = Math.min(1, value / max);
  return SCALE[t <= 0.34 ? 1 : t <= 0.67 ? 2 : 3];
}

export default function Heatmap({ today, days, valueOf, maxValue = 1 }: {
  today: string;
  days: number;
  valueOf: (date: string) => number;
  /** value that maps to full brightness (1 for binary habits) */
  maxValue?: number;
}) {
  const dates = dateWindow(today, days);
  // pad the start back to a Monday so columns are complete weeks
  const start = dates[0];
  const padded = [
    ...dateWindow(isoAddDays(start, -1), weekdayIndex(start)).map((d) => ({ date: d, pad: true })),
    ...dates.map((d) => ({ date: d, pad: false })),
  ];

  const weeks: { date: string; pad: boolean }[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const width = LEFT_PAD + weeks.length * (CELL + GAP);
  const height = TOP_PAD + 7 * (CELL + GAP);

  // month label whenever a column starts a new month
  let lastMonth = '';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      style={{ maxWidth: width * 1.4 }}
      role="img"
      aria-label="Daily activity heatmap"
    >
      {ROW_LABELS.map((label, i) => (
        <text
          key={label}
          x={LEFT_PAD - 6}
          y={TOP_PAD + (i * 2 + 0.5) * (CELL + GAP) + 4}
          textAnchor="end"
          className="fill-sub text-[9px]"
        >
          {label}
        </text>
      ))}

      {weeks.map((week, w) => {
        const x = LEFT_PAD + w * (CELL + GAP);
        const firstReal = week.find((d) => !d.pad);
        const month = firstReal?.date.slice(0, 7) ?? '';
        const showMonth = month !== lastMonth && firstReal;
        if (showMonth) lastMonth = month;
        return (
          <g key={w}>
            {showMonth && (
              <text x={x} y={10} className="fill-sub text-[9px]">
                {new Date(`${firstReal.date}T12:00:00Z`).toLocaleString('en', {
                  month: 'short',
                  timeZone: 'UTC',
                })}
              </text>
            )}
            {week.map((cell, d) =>
              cell.pad ? null : (
                <rect
                  key={cell.date}
                  x={x}
                  y={TOP_PAD + d * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={colorFor(valueOf(cell.date), maxValue)}
                  stroke={cell.date === today ? palette.accent : 'none'}
                  strokeWidth={cell.date === today ? 1.5 : 0}
                >
                  <title>{`${cell.date}: ${Math.round(valueOf(cell.date))}`}</title>
                </rect>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}
