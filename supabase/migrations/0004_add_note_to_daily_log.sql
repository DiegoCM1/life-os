-- Supabase ledger: 20260623224146_add_note_to_daily_log
-- Verbatim mirror of the applied migration (see README.md).
alter table daily_log add column if not exists note text;

comment on column daily_log.note is 'Free-text per-activity note. Used to record why an activity was not done on a given day (mandatory in the UI when an activity is missed).';
