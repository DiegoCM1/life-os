import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

// One button, every flavor. Replaces the ad-hoc button styles that had drifted
// across LoginForm, ActivityItem, WeekReviewForm, and the in-card menus.
const button = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-bg hover:shadow-glow-accent',
        ghost: 'border border-edge bg-transparent text-sub hover:border-accent hover:text-accent',
        danger: 'border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20',
        warn: 'border border-warn/40 bg-warn/10 text-warn hover:bg-warn/20',
        tregua: 'border border-tregua/40 bg-tregua/10 text-tregua hover:bg-tregua/20',
        good: 'border border-good/40 bg-good/15 text-good hover:bg-good/25',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-4 py-2 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export { Button, button as buttonVariants };
