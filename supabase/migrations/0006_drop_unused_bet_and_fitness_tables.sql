-- Supabase ledger: 20260623235524_drop_unused_bet_and_fitness_tables
-- Verbatim mirror of the applied migration (see README.md).
drop table if exists bet;
drop table if exists fitness_metric;
delete from daily_log where goal_id = 'deep_work_hours';
