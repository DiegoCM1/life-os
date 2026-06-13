import Link from 'next/link';
import { RANGES, type Range } from '@/lib/range';

// Server-rendered segmented control; selection lives in the URL so pages stay
// fully server-rendered. `basePath` + `param` build each option's href.
export default function RangeToggle({ basePath, param, active }: {
  basePath: string;
  param: string;
  active: Range;
}) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-edge">
      {RANGES.map((r) => (
        <Link
          key={r.id}
          href={`${basePath}?${param}=${r.id}`}
          className={`px-4 py-2 text-sm transition-colors ${
            r.id === active ? 'bg-accent font-semibold text-ink' : 'bg-well text-sub hover:text-ink'
          }`}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
