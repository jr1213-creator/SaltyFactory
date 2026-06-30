# Production Database

The compact Drizzle schema gap has been fixed. `packages/db/src/schema.ts` now defines the full production-depth schema for the original SaltyFactory product pipeline tables plus the SaaS/POD Business OS tables.

The regenerated base migration is `packages/db/migrations/0000_great_agent_zero.sql`. It creates 52 tables directly with production columns, workspace ownership, timestamps, status fields, JSONB fields, foreign keys, indexes, and unique constraints. It does not create compact `id`-only tables.

Provider credentials are not stored as raw database columns. Provider connection tables use `secret_ref` and configuration metadata only.

Repository adapters:
- Production runtime uses Drizzle/Postgres repositories selected by `packages/db/src/repositories/factory.ts`.
- In-memory repositories live under `packages/db/src/repositories/memory` and are for tests or explicitly configured development fixtures only.
- `APP_ENV=production` forbids memory persistence and requires `DATABASE_URL`.
- Drizzle repositories live under `packages/db/src/repositories/drizzle` and implement the same repository contract as memory repositories.

Remaining setup: provide real `DATABASE_URL`, Supabase project values, storage buckets, and provider account secrets before applying migrations to production.
