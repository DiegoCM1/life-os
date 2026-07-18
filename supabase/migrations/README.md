# Supabase migrations

These `.sql` files are a **manual, verbatim mirror of the live Supabase migration
ledger** (`supabase_migrations.schema_migrations`). They are applied by hand through
the Supabase SQL editor / MCP as the **admin role** — this project does **not** run
`supabase db push` or the Supabase CLI. The `000N_` prefix orders them; filename order
equals the chronological ledger order, so applying them top-to-bottom against a fresh
database reproduces the live schema exactly.

## Filename → ledger version

| File | Ledger version | Name |
| --- | --- | --- |
| `0001_init_life_dashboard.sql` | `20260613000643` | init_life_dashboard |
| `0002_lifeos_api_role_policies.sql` | `20260613003954` | lifeos_api_role_policies |
| `0003_add_done_at_to_daily_log.sql` | `20260623223342` | add_done_at_to_daily_log |
| `0004_add_note_to_daily_log.sql` | `20260623224146` | add_note_to_daily_log |
| `0005_create_day_meta.sql` | `20260623235505` | create_day_meta |
| `0006_drop_unused_bet_and_fitness_tables.sql` | `20260623235524` | drop_unused_bet_and_fitness_tables |
| `0007_add_tregua_columns.sql` | `20260624001819` | add_tregua_columns |
| `0008_day_meta_rls_policy_lifeos_api.sql` | `20260624022652` | day_meta_rls_policy_lifeos_api |
| `0009_week_review.sql` | `20260701030749` | week_review |

Each file's SQL is the ledger's stored statement verbatim, prefixed with a
`-- Supabase ledger: <version>_<name>` provenance comment. To re-verify parity:

```sql
select version, name, statements[1]
from supabase_migrations.schema_migrations
order by version;
```

## Prerequisites (not captured by the ledger)

The migrations reference a dedicated **`lifeos_api` login role** — the role the FastAPI
backend connects as (`DATABASE_URL`). This role is **not created by any migration**; it
was provisioned outside the ledger (Supabase project setup). Before applying these files
to a brand-new database you must first create that role and grant it base access, e.g.:

```sql
create role lifeos_api login password '...';         -- use the real backend password
grant usage on schema public to lifeos_api;
-- table-level grants: daily_log / status_field / day_meta base grants were also applied
-- outside the ledger; week_review's grant is in 0009. Grant select/insert/update/delete
-- on each API-written table to lifeos_api.
```

## The RLS rule that bites (learned the hard way)

A new table the backend writes needs **BOTH**:
1. `grant select, insert, update, delete on <table> to lifeos_api`, and
2. a permissive RLS policy: `create policy lifeos_api_all on <table> for all to lifeos_api using (true) with check (true)`.

RLS is enabled on every table but the `lifeos_api` role is not the owner, so **enabling
RLS without a policy silently 500s every write** (this is exactly what happened with
`day_meta` — see `0005` creating it and `0008` adding the missing policy). `0009_week_review`
gets both right in a single file; copy that shape for any future table.
