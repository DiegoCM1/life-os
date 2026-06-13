-- Life Dashboard v1 schema. Already applied to the Supabase project via MCP
-- (migration name: init_life_dashboard). Kept here as the source-of-truth mirror.
-- Single-user; tables are deliberately user_id-free but column sets allow
-- adding user_id later without rewrites (no composite business keys beyond date+goal).

create table public.daily_log (
  id bigint generated always as identity primary key,
  log_date date not null,
  goal_id text not null,
  done boolean,
  value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (log_date, goal_id)
);

create table public.fitness_metric (
  id bigint generated always as identity primary key,
  log_date date not null,
  metric text not null,
  value numeric not null,
  created_at timestamptz not null default now(),
  unique (log_date, metric)
);
create index fitness_metric_trend_idx on public.fitness_metric (metric, log_date);

create table public.bet (
  id bigint generated always as identity primary key,
  name text not null,
  enforcer text not null,
  rule_summary text not null,
  stake numeric not null default 0,
  reward numeric not null default 0,
  -- when goal_id is set, current streak is computed from daily_log at read time;
  -- current_streak below is only the fallback for unlinked bets
  goal_id text,
  current_streak integer not null default 0,
  payout_every_days integer not null default 30,
  net_balance numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.status_field (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- Only the FastAPI backend (direct Postgres connection, table owner) touches these
-- tables; RLS with no policies makes Supabase's anon/authenticated API keys useless here.
alter table public.daily_log enable row level security;
alter table public.fitness_metric enable row level security;
alter table public.bet enable row level security;
alter table public.status_field enable row level security;

-- Seed: two bet boards + project milestone strip (placeholder content, edit freely).
-- The applications bet has no goal_id: applications live in Notion, not daily_log,
-- so its streak is the stored current_streak (update via PATCH /bets/{id}).
insert into public.bet (name, enforcer, rule_summary, stake, reward, goal_id, payout_every_days) values
  ('Daily applications bet', 'Accountability partner', 'Hit the daily application target before 11:00 AM every weekday or pay the stake.', 50, 100, null, 30),
  ('Posted bet', 'Accountability partner', 'Post every day; miss a day and the streak resets.', 50, 100, 'posted', 30);

insert into public.status_field (key, value) values
  ('project_milestone', 'Define current milestone in the dashboard');
