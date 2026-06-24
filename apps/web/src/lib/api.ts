// Server-side client for the FastAPI backend. Only Next.js server code calls
// this — the browser never sees API_URL or API_SECRET (kiosk holds no secrets).

const API_URL = process.env.API_URL ?? 'http://localhost:8000';
const API_SECRET = process.env.API_SECRET ?? '';

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

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      headers: { 'X-API-Key': API_SECRET },
      cache: 'no-store',
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    // The dashboard must render even when the backend is briefly unreachable.
    return fallback;
  }
}

export function apiForward(path: string, method: string, body: unknown): Promise<Response> {
  return fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers: { 'X-API-Key': API_SECRET, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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

export const getStatus = () => apiGet<Record<string, string>>('/status', {});

export const getDayMeta = (start: string, end: string) =>
  apiGet<{ days: DayMeta[] }>(`/day-meta?start=${start}&end=${end}`, { days: [] });
