// Week/month/year range selection for topic detail pages, carried in the URL
// (?range=) so pages stay fully server-rendered.

export type Range = 'week' | 'month' | 'year';

export const RANGES: { id: Range; label: string; days: number }[] = [
  { id: 'week', label: 'Week', days: 7 },
  { id: 'month', label: 'Month', days: 30 },
  { id: 'year', label: 'Year', days: 365 },
];

export function parseRange(value: string | undefined): Range {
  return value === 'week' || value === 'year' ? value : 'month';
}

export function rangeDays(range: Range): number {
  return RANGES.find((r) => r.id === range)!.days;
}
