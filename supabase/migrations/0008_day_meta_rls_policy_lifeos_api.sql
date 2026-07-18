-- Supabase ledger: 20260624022652_day_meta_rls_policy_lifeos_api
-- Verbatim mirror of the applied migration (see README.md).
--
-- Mirror daily_log's RLS policy onto day_meta so the backend's lifeos_api role
-- can insert/update day-level notes and whole-day Tregua. Without this, RLS is
-- enabled but has no policy, so every write violates row-level security.
create policy lifeos_api_all on public.day_meta
  for all to lifeos_api
  using (true) with check (true);
