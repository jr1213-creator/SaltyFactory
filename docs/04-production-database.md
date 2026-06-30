# Production Database

The application database is managed Postgres/Supabase-compatible Postgres through `DATABASE_URL`. Drizzle schema lives in `packages/db/src/schema.ts`; migration SQL lives in `packages/db/migrations/0001_initial_saltyfactory.sql`. No API tokens or secrets are stored in database tables. Studio v1 access is server-side through trusted server code; public storefront reads only safe product projections.

Supabase Storage buckets: `saltyfactory-private-assets` for generated/private assets and `saltyfactory-public-assets` for approved public assets. The service role key is server-only. The anon key is public-limited. No client direct write to private assets is implemented.
