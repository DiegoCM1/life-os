import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

// The panel/card surface. Variant carries the state color (matches habit/day
// semantics), replacing the inline `border-x bg-x-dim` ternaries.
const panel = cva('rounded-xl border bg-card p-5 transition-colors', {
  variants: {
    variant: {
      default: 'border-edge',
      accent: 'border-accent shadow-glow-accent',
      good: 'border-good bg-good-dim',
      bad: 'border-bad bg-bad-dim',
      warn: 'border-warn bg-warn-dim',
      tregua: 'border-tregua bg-tregua-dim',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface PanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panel> {
  /** Optional terminal-style header bar rendered above the content. */
  header?: React.ReactNode;
}

const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({ className, variant, header, children, ...props }, ref) => (
    <div ref={ref} className={cn(panel({ variant }), className)} {...props}>
      {header != null && (
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sub">
          <span className="text-accent">▌</span>
          {header}
        </div>
      )}
      {children}
    </div>
  ),
);
Panel.displayName = 'Panel';

export { Panel, panel as panelVariants };
