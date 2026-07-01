import { cn } from '@/lib/cn';

// A big tabular number with its label. Numbers get a faint phosphor glow.
export function Stat({
  value,
  label,
  glow = false,
  className,
}: {
  value: React.ReactNode;
  label?: React.ReactNode;
  glow?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className={cn('readout text-3xl font-bold', glow && 'text-accent text-glow')}>
        {value}
      </div>
      {label != null && <div className="text-xs text-sub">{label}</div>}
    </div>
  );
}
