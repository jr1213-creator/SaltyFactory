# SaltyFactory

Production-ready v1 monorepo for Salty Cowhide Co. headless storefront and private SaltyFactory Studio.

The implementation includes managed Postgres/Supabase configuration, Drizzle schema and migrations, Supabase Storage boundaries, disabled-by-default provider adapters, guarded publish gates, Studio auth, storefront routes, Studio routes, and a worker.

Run pnpm install, then pnpm lint, pnpm typecheck, pnpm test, pnpm build, and the check:* scripts. pnpm db:health requires a real managed Postgres DATABASE_URL and fails honestly when it is missing.

