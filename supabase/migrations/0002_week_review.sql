-- 12 Week Year — weekly reviews. Single-cycle for now: the plan (vision, goals,
-- targets, tactics) lives in the web app's config/cycle.ts; this table stores
-- only what the user authors and what can't be derived from daily_log/Notion:
-- the reflection answers, sleep, the (frozen) per-week AI note, and the review's
-- execution score. Keyed on week_number since there is one active cycle.
--
-- Apply this the same way day_meta was applied (Supabase SQL editor / MCP as the
-- admin role). The permissive lifeos_api_all policy below is REQUIRED: without it
-- the FastAPI role is subject to RLS with no policy and every write 500s silently
-- (the exact bug we hit on day_meta).

create table public.week_review (
  id bigint generated always as identity primary key,
  week_number integer not null unique,
  week_start date,
  -- 0..100 execution %. Stored for now; will be computed from daily_log + Notion
  -- (tactics done ÷ committed) at week close later.
  exec_score numeric,
  sleep_avg numeric,
  -- promptId -> answer text (see REFLECTION_PROMPTS in config/cycle.ts)
  answers jsonb not null default '{}'::jsonb,
  -- frozen per-week AI note, generated once at week close. null until generated.
  ai_summary text,
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.week_review enable row level security;

-- The FastAPI backend connects as the `lifeos_api` role. A new table it doesn't
-- own needs BOTH of these or every write 500s: the table privileges AND a
-- permissive RLS policy for that role. (This is the full fix behind the day_meta
-- lesson — the policy alone isn't enough without the grants.)
grant select, insert, update, delete on public.week_review to lifeos_api;

create policy lifeos_api_all on public.week_review
  for all to lifeos_api using (true) with check (true);
