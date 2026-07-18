'use client'; // Error boundaries must be Client Components.

import { useEffect } from 'react';

// Route-segment error boundary: catches render errors in any page under the root
// layout (today, topic/*, cycle, login) and shows fallback UI instead of a blank
// screen. Logs to the console so the failure is visible in devtools. Uses the
// Next 16 `unstable_retry` prop (re-fetches + re-renders the segment).
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[error-boundary]', error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-5">
      <section className="card border-bad bg-bad-dim">
        <h1 className="text-xl font-bold text-bad">Something broke</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/90">
          This screen hit an unexpected error and stopped rendering. The failure is
          logged to the console.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs tabular-nums text-sub">Reference: {error.digest}</p>
        )}
        <button
          onClick={() => unstable_retry()}
          className="mt-4 self-start rounded bg-good/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-good transition-colors hover:bg-good/30"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
