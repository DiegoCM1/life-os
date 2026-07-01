import { RANGES, type Range } from '@/lib/range';
import { SegmentedControl } from '@/components/ui';

// Server-rendered segmented control; selection lives in the URL so pages stay
// fully server-rendered. Thin wrapper over the shared SegmentedControl primitive.
export default function RangeToggle({ basePath, param, active }: {
  basePath: string;
  param: string;
  active: Range;
}) {
  return (
    <SegmentedControl
      segments={RANGES.map((r) => ({
        label: r.label,
        href: `${basePath}?${param}=${r.id}`,
        active: r.id === active,
      }))}
    />
  );
}
