// Server-side client for the FastAPI backend. Only Next.js server code calls
// this — the browser never sees API_URL or API_SECRET (kiosk holds no secrets).

// A hung backend must not hang the page render. Comfortably above the API's own
// 5s dependency probes so a slow-but-alive backend still wins.
const REQUEST_TIMEOUT_MS = 12_000;

const DEV_FALLBACK_URL = 'http://localhost:8000';

/** Why a read failed. The distinction matters: `config` is your mistake and no
 *  amount of waiting fixes it, `unreachable` means the process is down, `http`
 *  means it answered and is broken inside (that was the Supabase outage). */
export type FailureKind = 'config' | 'unreachable' | 'timeout' | 'http';

export type Failure = {
  kind: FailureKind;
  detail: string;
  status?: number;
  /** X-Request-ID from the API — grep the backend logs with this. */
  requestId?: string;
};

export type MaybeFailed = { _unreachable?: boolean; _failure?: Failure };

/** Resolve the backend config, refusing to paper over a missing one in prod.
 *
 * The old code defaulted to localhost in every environment, so an unset API_URL
 * on Vercel surfaced as a confusing connection error from a serverless function
 * dialing its own loopback. In production that is now a named config failure. */
function resolveConfig(): { url: string; secret: string; problem?: Failure } {
  const url = process.env.API_URL;
  const secret = process.env.API_SECRET ?? '';
  const isProd = process.env.NODE_ENV === 'production';

  if (!url) {
    if (isProd) {
      return {
        url: '',
        secret,
        problem: {
          kind: 'config',
          detail: 'API_URL is not set on this deployment. Set it to the backend URL and redeploy.',
        },
      };
    }
    return { url: DEV_FALLBACK_URL, secret };
  }
  if (isProd && !secret) {
    return {
      url,
      secret,
      problem: {
        kind: 'config',
        detail: 'API_SECRET is not set on this deployment — every backend call will 401.',
      },
    };
  }
  return { url, secret };
}

const { url: API_URL, secret: API_SECRET } = resolveConfig();

/** Turn a thrown fetch error into a named failure. */
function classify(err: unknown, url: string): Failure {
  const e = err as { name?: string; cause?: { code?: string } };
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
    return { kind: 'timeout', detail: `No response from ${url} within ${REQUEST_TIMEOUT_MS}ms` };
  }
  const code = e?.cause?.code;
  if (code === 'ECONNREFUSED') {
    return { kind: 'unreachable', detail: `Nothing listening at ${url} (ECONNREFUSED)` };
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return { kind: 'unreachable', detail: `Cannot resolve host for ${url} (${code})` };
  }
  return { kind: 'unreachable', detail: `${String(err)} (${url})` };
}

function logFailure(path: string, f: Failure): void {
  console.error(
    `[api] ${path} → ${f.kind.toUpperCase()}: ${f.detail}` +
      (f.status ? ` [status ${f.status}]` : '') +
      (f.requestId ? ` [request-id ${f.requestId}]` : ''),
  );
}

export type TodayLog = {
  goal_id: string;
  done: boolean | null;
  value: number | null;
  done_at: string | null; // ISO instant when done last flipped true; null otherwise
  note: string | null; // per-activity reason ("why not done" or Tregua reason)
  tregua: boolean; // activity excused for the day (pauses the streak)
};
export type DayMeta = { log_date: string; note: string | null; tregua: boolean };
export type MonthLog = TodayLog & { log_date: string };
export type Applications = {
  configured: boolean;
  error?: string;
  today_count: number | null;
  status_breakdown: Record<string, number>;
};
export type AppsDaily = {
  configured: boolean;
  error?: string;
  daily: { date: string; count: number }[];
};
export type AppsStats = {
  configured: boolean;
  error?: string;
  total: number;
  status_counts: Record<string, number>;
  tier_counts: Record<string, number>;
};

// On any read failure we return the caller's empty fallback (the dashboard must
// still render), but tag it with `_unreachable` and log it — so an outage looks
// like an outage in the UI + server logs, not like an empty day. Success payloads
// carry no flag.
async function apiGet<T extends object>(
  path: string,
  fallback: T,
): Promise<T & MaybeFailed> {
  const { problem } = resolveConfig();
  if (problem) {
    // Misconfiguration is not an outage — say so, and don't waste 12s dialing.
    logFailure(`GET ${path}`, problem);
    return { ...fallback, _unreachable: true, _failure: problem };
  }

  const url = `${API_URL}/api/v1${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'X-API-Key': API_SECRET },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      const failure: Failure = {
        kind: 'http',
        // The backend answered — this is an error inside it, not a network fault.
        detail: `Backend responded ${res.status} ${res.statusText}`,
        status: res.status,
        requestId: res.headers.get('X-Request-ID') ?? undefined,
      };
      logFailure(`GET ${path}`, failure);
      return { ...fallback, _unreachable: true, _failure: failure };
    }
    return (await res.json()) as T;
  } catch (err) {
    const failure = classify(err, url);
    logFailure(`GET ${path}`, failure);
    return { ...fallback, _unreachable: true, _failure: failure };
  }
}

/** True if any of the given read results came back from an unreachable backend. */
export function anyUnreachable(...results: Array<MaybeFailed>): boolean {
  return results.some((r) => r?._unreachable === true);
}

/** The first real failure among the given reads, for rendering a specific
 *  banner instead of a generic "backend unreachable". */
export function firstFailure(...results: Array<MaybeFailed>): Failure | null {
  return results.find((r) => r?._failure)?._failure ?? null;
}

/** What this deployment of the web app believes about its backend, plus a live
 *  probe of it. Powers GET /api/diag — the first thing to check when the
 *  dashboard looks wrong, because it answers "is it me or the backend?".
 *
 *  Secrets are never returned, only whether they are present. */
export async function apiDiagnostics(): Promise<Record<string, unknown>> {
  const { url, secret, problem } = resolveConfig();
  const web = {
    node_env: process.env.NODE_ENV ?? 'unknown',
    api_url: url || '(unset)',
    api_url_source: process.env.API_URL ? 'env' : 'dev fallback',
    api_secret: secret ? 'set' : 'unset',
    app_password: process.env.APP_PASSWORD ? 'set' : 'unset',
    vercel_env: process.env.VERCEL_ENV ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    timeout_ms: REQUEST_TIMEOUT_MS,
  };

  if (problem) return { ok: false, web, backend: null, failure: problem };

  const started = Date.now();
  try {
    const res = await fetch(`${url}/health/detail`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const latency_ms = Date.now() - started;
    const body = (await res.json().catch(() => null)) as { status?: string } | null;
    // /health/detail answers 200 even when a dependency is down (the payload is
    // the point), so HTTP status alone would report a live outage as healthy.
    const backendStatus = body?.status;
    const healthy = res.ok && backendStatus === 'ok';
    const failure: Failure | null = !res.ok
      ? { kind: 'http', detail: `Backend health returned ${res.status}`, status: res.status }
      : healthy
        ? null
        : {
            kind: 'http',
            detail:
              `Backend is reachable but reports "${backendStatus ?? 'unknown'}" — ` +
              (body as { checks?: { name: string; status: string; detail?: string }[] } | null)?.checks
                ?.filter((c) => c.status !== 'ok')
                .map((c) => `${c.name}: ${c.status}${c.detail ? ` (${c.detail})` : ''}`)
                .join('; '),
          };
    return {
      ok: healthy,
      web,
      backend: { http_status: res.status, latency_ms, ...(body ?? {}) },
      failure,
    };
  } catch (err) {
    return {
      ok: false,
      web,
      backend: { latency_ms: Date.now() - started },
      failure: classify(err, `${url}/health/detail`),
    };
  }
}

export function apiForward(path: string, method: string, body: unknown): Promise<Response> {
  return fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: { 'X-API-Key': API_SECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

// Like apiForward, but always resolves to a JSON-safe { status, body } — even when
// the backend errors with a non-JSON body (e.g. a 500 "Internal Server Error") or
// is unreachable. Keeps the Next route from throwing a JSON parse error and lets
// the browser see a real status to act on.
export async function apiForwardJson(
  path: string,
  method: string,
  body: unknown,
): Promise<{ status: number; body: unknown }> {
  const { problem } = resolveConfig();
  if (problem) {
    logFailure(`${method} ${path}`, problem);
    return { status: 503, body: { error: problem.detail, kind: problem.kind } };
  }

  try {
    const res = await apiForward(path, method, body);
    const text = await res.text();
    const requestId = res.headers.get('X-Request-ID') ?? undefined;
    if (res.status >= 500) {
      logFailure(`${method} ${path}`, {
        kind: 'http',
        detail: `Backend responded ${res.status}`,
        status: res.status,
        requestId,
      });
    }
    try {
      return { status: res.status, body: text ? JSON.parse(text) : null };
    } catch {
      // Non-JSON body (a proxy error page, a bare "Internal Server Error") —
      // pass the text through so the browser sees something actionable.
      return { status: res.status, body: { error: text || res.statusText, requestId } };
    }
  } catch (err) {
    const failure = classify(err, `${API_URL}/api/v1${path}`);
    logFailure(`${method} ${path}`, failure);
    return { status: 502, body: { error: failure.detail, kind: failure.kind } };
  }
}

export const getLogs = (start: string, end: string) =>
  apiGet<{ logs: MonthLog[] }>(`/logs?start=${start}&end=${end}`, { logs: [] });

export const getApplications = () =>
  apiGet<Applications>('/applications', {
    configured: false,
    today_count: null,
    status_breakdown: {},
  });

export const getApplicationsDaily = (days = 30) =>
  apiGet<AppsDaily>(`/applications/daily?days=${days}`, { configured: false, daily: [] });

export const getApplicationsStats = () =>
  apiGet<AppsStats>('/applications/stats', {
    configured: false,
    total: 0,
    status_counts: {},
    tier_counts: {},
  });

/** Raw cross-tabs from Notion: status counts per segment bucket, per week.
 *  No rates are computed server-side — see APPLICATION_OUTCOMES in config. */
export type AppsInsights = {
  configured: boolean;
  error?: string;
  total: number;
  status_counts: Record<string, number>;
  /** dimension → bucket → status → count. Unset values bucket as "(unset)". */
  segments: Record<string, Record<string, Record<string, number>>>;
  /** oldest first, keyed by the Monday of the application week */
  weekly: { week_start: string; counts: Record<string, number> }[];
  /** how many rows have each dimension actually filled in */
  coverage: Record<string, number>;
};

export const getApplicationsInsights = () =>
  apiGet<AppsInsights>('/applications/insights', {
    configured: false,
    total: 0,
    status_counts: {},
    segments: {},
    weekly: [],
    coverage: {},
  });

export const getStatus = () => apiGet<Record<string, string>>('/status', {});

export const getDayMeta = (start: string, end: string) =>
  apiGet<{ days: DayMeta[] }>(`/day-meta?start=${start}&end=${end}`, { days: [] });

export type WeekReview = {
  week_number: number;
  week_start: string | null;
  exec_score: number | null;
  sleep_avg: number | null;
  answers: Record<string, string>;
  ai_summary: string | null;
  reviewed: boolean;
};

// Persisted weekly reviews. Falls back to empty so /cycle renders on the mock
// scaffold even when the backend is briefly unreachable.
export const getWeeks = () => apiGet<{ weeks: WeekReview[] }>('/weeks', { weeks: [] });
