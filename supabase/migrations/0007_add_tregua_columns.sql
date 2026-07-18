-- Supabase ledger: 20260624001819_add_tregua_columns
-- Verbatim mirror of the applied migration (see README.md).
alter table daily_log add column if not exists tregua boolean not null default false;
alter table day_meta add column if not exists tregua boolean not null default false;

comment on column daily_log.tregua is 'Per-activity Tregua: this activity is excused for the day (external forces). Pauses (bridges) the streak; reason stored in note. Mutually exclusive with done.';
comment on column day_meta.tregua is 'Whole-day Tregua: every activity that day is excused. Reason stored in day_meta.note.';
