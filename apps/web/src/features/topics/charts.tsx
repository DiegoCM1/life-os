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
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { alpha, palette } from '@/design/tokens';

// All chart colors derive from the token palette (single source of truth).
const COLORS = {
  good: palette.good,
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
