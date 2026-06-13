// Server-side client for the FastAPI backend. Only Next.js server code calls
// this — the browser never sees API_URL or API_SECRET (kiosk holds no secrets).

const API_URL = process.env.API_URL ?? 'http://localhost:8000';
const API_SECRET = process.env.API_SECRET ?? '';

export type TodayLog = { goal_id: string; done: boolean | null; value: number | null };
export type MonthLog = TodayLog & { log_date: string };
export type Bet = {
  id: number;
  name: string;
  enforcer: string;
  rule_summary: string;
  stake: number;
  reward: number;
  current_streak: number;
  days_to_payout: number;
  net_balance: number;
};
export type Applications = {
  configured: boolean;
  error?: string;
  today_count: number | null;
  status_breakdown: Record<string, number>;
};
export type Fitness = {
  latest: Record<string, number>;
  series: Record<string, { date: string; value: number }[]>;
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

export const getToday = () =>
  apiGet<{ date: string; logs: TodayLog[] }>('/today', { date: '', logs: [] });

export const getLogs = (start: string, end: string) =>
  apiGet<{ logs: MonthLog[] }>(`/logs?start=${start}&end=${end}`, { logs: [] });

export const getBets = () => apiGet<{ bets: Bet[] }>('/bets', { bets: [] });

export const getApplications = () =>
  apiGet<Applications>('/applications', {
    configured: false,
    today_count: null,
    status_breakdown: {},
  });

export const getFitness = () => apiGet<Fitness>('/fitness', { latest: {}, series: {} });

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
