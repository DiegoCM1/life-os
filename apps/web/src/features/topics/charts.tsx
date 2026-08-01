'use client';

// All Recharts usage lives in this one client component file (brief: Recharts
// only for genuine trend charts, marked 'use client'; everything else stays
// server-rendered).

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { alpha, palette } from '@/design/tokens';
import { formatClock } from '@/lib/time';

// All chart colors derive from the token palette (single source of truth).
const COLORS = {
  good: palette.good,
  bad: palette.bad,
  accent: palette.accent,
  sub: palette.sub,
  grid: palette.edge,
  tooltipBg: palette.card,
};

const axisProps = {
  stroke: COLORS.sub,
  tick: { fill: COLORS.sub, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: COLORS.grid },
} as const;

const tooltipProps = {
  contentStyle: {
    background: COLORS.tooltipBg,
    border: `1px solid ${COLORS.grid}`,
    borderRadius: 10,
    color: palette.ink,
    fontSize: 12,
  },
  cursor: { fill: alpha(palette.accent, '14') },
} as const;

/** Generic bar chart over labeled buckets (weeks, months, weekdays…). */
export function CountBars({ data, name, color = COLORS.good, yMax }: {
  data: { label: string; value: number }[];
  name: string;
  color?: string;
  yMax?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis
          domain={yMax ? [0, yMax] : undefined}
          allowDecimals={false}
          {...axisProps}
        />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="value" name={name} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Generic trend line over dated points. */
export function TrendLine({ data, name, color = COLORS.good, unit, yMax, dots = false }: {
  data: { date: string; value: number }[];
  name: string;
  color?: string;
  unit?: string;
  yMax?: number;
  dots?: boolean;
}) {
  const points = data.map((d) => ({ ...d, value: Math.round(d.value), date: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="date" {...axisProps} interval="preserveStartEnd" minTickGap={28} />
        <YAxis domain={yMax ? [0, yMax] : undefined} {...axisProps} />
        <Tooltip {...tooltipProps} formatter={(v) => [`${v}${unit ?? ''}`, name]} />
        <Line
          type="monotone"
          dataKey="value"
          name={name}
          stroke={color}
          strokeWidth={2}
          dot={dots ? { r: 3, fill: color } : false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Per-day wake time (minutes since midnight) with target/fail reference lines.
 *  Points are colored by band: good (before target), late, fail. */
export function WakeScatter({ data, target = 480, fail = 600 }: {
  data: { date: string; minutes: number; band: 'good' | 'late' | 'fail' }[];
  target?: number;
  fail?: number;
}) {
  const bandColor = { good: palette.good, late: palette.warn, fail: palette.bad };
  const points = data.map((d) => ({ ...d, day: d.date.slice(5) }));
  const mins = data.map((d) => d.minutes);
  const lo = Math.min(target, ...mins);
  const hi = Math.max(fail, ...mins);
  const domain = [Math.floor((lo - 30) / 60) * 60, Math.ceil((hi + 30) / 60) * 60];
  // Thin the category ticks so a full year doesn't crowd the axis.
  const tickInterval = Math.max(0, Math.floor(points.length / 8));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ScatterChart data={points} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="day" type="category" {...axisProps} interval={tickInterval} />
        <YAxis
          type="number"
          dataKey="minutes"
          domain={domain}
          tickFormatter={(v) => formatClock(v as number)}
          {...axisProps}
          width={64}
        />
        <ReferenceLine
          y={target}
          stroke={COLORS.good}
          strokeDasharray="4 3"
          label={{ value: `${Math.floor(target / 60)}:00 target`, position: 'insideTopRight', fill: COLORS.good, fontSize: 10 }}
        />
        <ReferenceLine
          y={fail}
          stroke={COLORS.bad}
          strokeDasharray="4 3"
          label={{ value: `${Math.floor(fail / 60)}:00`, position: 'insideBottomRight', fill: COLORS.bad, fontSize: 10 }}
        />
        <Tooltip
          {...tooltipProps}
          formatter={(v) => [formatClock(v as number), 'wake']}
        />
        <Scatter dataKey="minutes" name="wake time">
          {points.map((p, i) => (
            <Cell key={i} fill={bandColor[p.band]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/** Weekly application cohorts, stacked by how they ended up.
 *
 *  Cohorted by the week the application was SENT, so the most recent weeks are
 *  right-censored — nothing sent 3 days ago has had time to be ghosted. Those
 *  weeks render at reduced opacity and are named in the caption rather than
 *  being silently dropped, which would flatter the recent numbers.
 *
 *  Each segment carries a 2px surface-colored stroke so adjacent fills read as
 *  separate blocks (also the secondary encoding that keeps the stack legible
 *  without relying on hue alone). */
export function OutcomeStack({ data, series }: {
  // outcome keys carry the numeric counts alongside the two fixed fields
  data: { label: string; unresolved: boolean; [outcome: string]: string | number | boolean }[];
  series: { key: string; label: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipProps} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="outcome" fill={s.color}
               stroke={COLORS.tooltipBg} strokeWidth={2}>
            {data.map((d, i) => (
              <Cell key={i} fillOpacity={d.unresolved ? 0.35 : 1} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Volume-per-day area chart (applications). */
export function VolumeArea({ data, name }: {
  data: { date: string; value: number }[];
  name: string;
}) {
  const points = data.map((d) => ({ ...d, date: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="date" {...axisProps} interval="preserveStartEnd" minTickGap={28} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip {...tooltipProps} />
        <Area
          type="monotone"
          dataKey="value"
          name={name}
          stroke={COLORS.accent}
          fill={alpha(palette.accent, '2e')}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
