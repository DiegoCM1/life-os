import { cn } from '@/lib/cn';

// Terminal-style section label with a phosphor prompt marker.
export function SectionTitle({
  children,
  className,
  marker = true,
}: {
  children: React.ReactNode;
  className?: string;
  marker?: boolean;
}) {
  return (
    <h2
      className={cn(
        'mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-sub',
        className,
      )}
    >
      {marker && <span className="text-accent">›</span>}
      {children}
    </h2>
  );
}
