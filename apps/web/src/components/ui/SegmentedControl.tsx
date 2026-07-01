import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface Segment {
  label: string;
  href: string;
  active: boolean;
}

// Server-rendered, URL-driven segmented control. Generalizes RangeToggle so any
// tabbed selector shares one look. Selection stays in the URL (no client JS).
export function SegmentedControl({
  segments,
  className,
}: {
  segments: Segment[];
  className?: string;
}) {
  return (
    <div className={cn('flex overflow-hidden rounded-lg border border-edge', className)}>
      {segments.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          className={cn(
            'px-4 py-2 text-sm transition-colors',
            s.active
              ? 'bg-accent font-semibold text-bg'
              : 'bg-well text-sub hover:text-accent',
          )}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
