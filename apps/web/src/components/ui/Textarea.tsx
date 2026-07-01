import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

// Matches Input's shape so forms read as one system.
const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full resize-none rounded-lg border border-edge bg-well px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-sub/60 focus:border-accent',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
