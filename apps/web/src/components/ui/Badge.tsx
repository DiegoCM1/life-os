import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

// Status pills (Late / Too late / Tregua / ⚠ Reason / streaks). Replaces the
// repeated inline `rounded bg-x/15 px-1.5 ...` spans in ActivityItem & friends.
const badge = cva(
  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
  {
    variants: {
      variant: {
        neutral: 'bg-well text-sub',
        accent: 'bg-accent/15 text-accent',
        good: 'bg-good/15 text-good',
        bad: 'bg-bad/15 text-bad',
        warn: 'bg-warn/15 text-warn',
        tregua: 'bg-tregua/15 text-tregua',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}
