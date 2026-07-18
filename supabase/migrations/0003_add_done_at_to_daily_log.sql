-- Supabase ledger: 20260623223342_add_done_at_to_daily_log
-- Verbatim mirror of the applied migration (see README.md).
alter table daily_log add column if not exists done_at timestamptz;

comment on column daily_log.done_at is 'When done last flipped to true (server time). Compared against the goal''s deadline to flag late completions. Null = never completed or completed before this column existed.';
