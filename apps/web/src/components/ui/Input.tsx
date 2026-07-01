import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

// Unified text input — one radius/padding/focus-glow (fixes the rounded-xl vs
// rounded-lg drift between LoginForm and the inline editors).
const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-edge bg-well px-4 py-3 text-ink outline-none transition-colors placeholder:text-sub/60 focus:border-accent focus:shadow-glow-accent',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
