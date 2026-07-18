'use client'; // Error boundaries must be Client Components.

import { useEffect } from 'react';

// Root-layout error boundary. Catches errors thrown in the root layout itself,
// which `error.tsx` cannot. It REPLACES the root layout when active, so it must
// render its own <html>/<body> and can't rely on the Tailwind/token setup from
// layout.tsx — styles are inlined against the phosphor palette to avoid a
// white-flash crash screen.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#04110b',
          color: '#d6f5e0',
          fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
        }}
      >
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
          <h1 style={{ color: '#ff5c57', fontSize: 22, margin: '0 0 12px' }}>
            The app crashed
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
            A fatal error took down the whole page. Reloading usually fixes it; the
            error is logged to the console.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: '#5f8f74', margin: '0 0 12px' }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: 8,
              border: '1px solid #16351f',
              background: 'rgba(61,220,132,0.2)',
              color: '#3ddc84',
              borderRadius: 6,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
