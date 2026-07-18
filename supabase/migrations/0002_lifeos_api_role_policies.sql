-- Supabase ledger: 20260613003954_lifeos_api_role_policies
-- Verbatim mirror of the applied migration (see README.md).
--
-- Prerequisite: the `lifeos_api` login role must already exist (provisioned
-- outside the ledger — see README.md "Prerequisites"). These policies reference
-- it but do not create it.
--
-- RLS stays deny-all for anon/authenticated; the backend's dedicated role gets
-- explicit full access (it is not the table owner, so it needs policies).
create policy lifeos_api_all on public.daily_log for all to lifeos_api using (true) with check (true);
create policy lifeos_api_all on public.fitness_metric for all to lifeos_api using (true) with check (true);
create policy lifeos_api_all on public.bet for all to lifeos_api using (true) with check (true);
create policy lifeos_api_all on public.status_field for all to lifeos_api using (true) with check (true);
