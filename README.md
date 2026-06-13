# Life Dashboard

Single-user, self-hosted personal observability center for an always-on kiosk.
One page, tap-first logging, dark theme, light enough for a 4GB Celeron running
fullscreen Chromium.

## Architecture

```
 phone / laptop / kiosk (Chromium, no secrets)
        │  HTTPS + password gate cookie
        ▼
 Next.js on Vercel (apps/web) ── reads/writes ──► FastAPI on Railway (apps/api)
                                                    │                │
                                       Supabase Postgres      Notion API (read-only)
                                       (check-ins, fitness,   (job applications)
                                        bets, status)
```

- **FastAPI is the single write front door.** The browser never talks to
  Supabase or Notion directly; Next.js server code proxies everything with the
  shared secret. The v2 Overseer (WhatsApp agent) will write through the same
  endpoints.
- **Two stores, one view:** applications live in Notion (read-only here),
  everything else in Postgres. Merged only at display time.
- Day boundaries and the daily deadlines (applications by 9:00 AM, post + prep
  by 7:00 PM) are computed in **America/Mexico_City** on both server and
  client, regardless of device tz.

## Repo layout

| Path | What |
|---|---|
| `apps/web` | Next.js 16 + Tailwind v3 frontend (Vercel), pnpm workspace |
| `apps/api` | FastAPI backend (Railway, Dockerfile included) |
| `supabase/migrations` | Schema (already applied to the Supabase project) |
| `apps/web/src/config/goals.ts` | **The one file to edit**: goals, targets, dated goal, book, mantras |

The frontend is organized by feature: `src/features/{auth,dashboard,deadline,habits,bets,fitness,unscoreable}`, with shared infra in `src/lib` (`api.ts`, `time.ts`), shared UI in `src/components`, and thin route files in `src/app`. The centerpiece is the habit spiral (`features/habits/HabitSpiral.tsx`): one concentric ring per habit, one cell per day of the month, and the side buttons drop a green square into today's cell when tapped — all server-rendered inline SVG, no charting lib.

## API endpoints (all under `/api/v1`, gated by `X-API-Key` or `Authorization: Bearer`)

- `PUT /log` — upsert a day's toggle/number check-in (`goal_id`, `done?`, `value?`, `log_date?`)
- `GET /today`, `GET /logs?start&end` — check-ins for today / a range (habit wheel)
- `PUT /fitness`, `GET /fitness?days` — fitness metrics + latest values
- `GET /bets`, `PATCH /bets/{id}` — bet boards (streak computed from `daily_log` when the bet has a `goal_id`)
- `GET /status`, `PUT /status/{key}` — milestone strip and other free-text fields
- `GET /applications` — today's count + status breakdown from Notion (90s cache)
- `GET /health` — unauthenticated liveness

## Local development

```bash
# API (apps/api)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, SHARED_SECRET, NOTION_*
set -a; source .env; set +a
.venv/bin/uvicorn app.main:app --reload

# Web (apps/web) — pnpm workspace, run from the repo root
pnpm install
cp apps/web/.env.example apps/web/.env.local   # API_URL=http://localhost:8000, API_SECRET, APP_PASSWORD
pnpm dev
```

## Deployment

Already done: the Supabase schema is applied (RLS deny-all; only the API's
direct Postgres connection is used).

**Railway (API):**
1. New service from this repo, root directory `apps/api` (it has the Dockerfile).
2. Set env vars from `apps/api/.env.example`. For `DATABASE_URL` use the
   Supabase **session pooler** connection string (Railway is IPv4).
3. Generate a public domain; check `https://<domain>/health`.

**Vercel (web):**
1. New project from this repo, root directory `apps/web` (Vercel detects the
   pnpm workspace via the root `pnpm-lock.yaml`).
2. Set env vars from `apps/web/.env.example` (`API_URL` = Railway domain,
   `API_SECRET` = the Railway `SHARED_SECRET`, `APP_PASSWORD` = what you type
   at the gate).

**Notion:** create an internal integration, copy its token, share the
applications database with it, and set `NOTION_DATABASE_ID` plus the property
names (`NOTION_DATE_PROP`, `NOTION_STATUS_PROP`) if they differ from
`Date`/`Status`.

**Kiosk:** Chromium in kiosk mode pointed at the Vercel URL; log in once (the
gate cookie lasts a year). The kiosk holds no secrets and runs no app logic.

## Phasing

- **v1 (this):** Today view — deadline countdown, Notion application count,
  non-negotiable toggles/steppers, two bet boards, dated-goal countdown with
  fitness steppers, milestone strip, habit wheel (inline SVG), un-scoreable
  corner. 90s polling, no websockets.
- **v1.5:** Fitness/Career views with Recharts trend charts (`'use client'`),
  optional view auto-rotate. `GET /fitness` already returns the series data.
- **v2:** the Overseer writes via the same `PUT /log` / `PUT /fitness`
  endpoints with the same shared secret. No API changes needed.
