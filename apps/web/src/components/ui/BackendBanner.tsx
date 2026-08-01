// Shown at the top of a page when one or more backend reads came back empty
// because the API failed — so an outage reads as an outage, not as an empty day
// (and not as "Notion isn't configured"). Pure markup; a server component
// decides when to render it, gated on `anyUnreachable(...)` from @/lib/api.
//
// Takes the failure so the banner can name the actual problem. The three cases
// need three different reactions from you, and a single generic string sent us
// to check the wrong layer once already:
//   config      → you forgot an env var; nothing will fix itself
//   unreachable → the process is down or the host is wrong
//   http        → the backend is UP and answering, and broken inside
import type { Failure } from '@/lib/api';

const HEADLINE: Record<Failure['kind'], string> = {
  config: '⚠ Backend not configured',
  unreachable: '⚠ Backend unreachable',
  timeout: '⚠ Backend not responding',
  http: '⚠ Backend is erroring',
};

const HINT: Record<Failure['kind'], string> = {
  config: 'This is an environment-variable problem — it will not resolve on its own.',
  unreachable: 'The API process is down, or API_URL points somewhere wrong.',
  timeout: 'The API accepted the connection but never answered. Check its logs and database.',
  http: 'The API is running and answering — the fault is inside it. Check /health/detail.',
};

export function BackendBanner({ failure }: { failure?: Failure | null }) {
  const kind = failure?.kind ?? 'unreachable';
  return (
    <section
      role="alert"
      className="card border-bad bg-bad-dim py-3 text-sm text-bad"
    >
      <p className="text-center font-semibold">
        {HEADLINE[kind]} — showing empty data. Changes won’t save until it’s back.
      </p>
      {failure && (
        <>
          <p className="mt-2 text-center text-xs opacity-90">{HINT[kind]}</p>
          <p className="mt-1 text-center font-mono text-xs opacity-75">
            {failure.detail}
            {failure.requestId && ` · request-id ${failure.requestId}`}
          </p>
        </>
      )}
    </section>
  );
}
