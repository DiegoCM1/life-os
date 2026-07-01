import { cn } from '@/lib/cn';

// Blinking terminal cursor. Pure CSS (animate-blink) — no client JS, and it
// stops for prefers-reduced-motion (handled in globals.css).
export function Cursor({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('animate-blink text-accent', className)}>
      _
    </span>
  );
}
