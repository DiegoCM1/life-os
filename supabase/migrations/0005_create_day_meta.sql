-- Supabase ledger: 20260623235505_create_day_meta
-- Verbatim mirror of the applied migration (see README.md).
create table if not exists day_meta (
  log_date date primary key,
  note text,
  updated_at timestamptz not null default now()
);

alter table day_meta enable row level security;

comment on table day_meta is 'Per-day metadata (one row per calendar day). Holds the day-level note; future day-level fields (e.g. whole-day Tregua) go here too. Accessed only by the API via a direct connection, so no RLS policies are needed.';
