# Deployment

The application is production-configurable, but deployment still requires real environment values.

Code completed in this pass:
- Expanded Drizzle schema and regenerated migration.
- Expanded repository layer for workspace-scoped Studio, worker, storefront projection, audit, publish, billing, marketing, support, and AI employee flows.
- Expanded test coverage to validate schema depth, migrations, repositories, isolation, provider guardrails, publish gates, Studio auth, worker behavior, and static guardrails.

Required deployment setup:
- `DATABASE_URL` and Supabase project credentials.
- Supabase private/public storage buckets.
- Studio admin email and `AUTH_SECRET`.
- Shopify, Printify, and HuggingFace credentials only if their feature flags are explicitly enabled.
- Keep `LIVE_PUBLISHING_ENABLED=false` until gate-tested production launch.

Repository adapter behavior:
- `REPOSITORY_ADAPTER=auto` is the default.
- `APP_ENV=production` with `DATABASE_URL` selects Drizzle repositories.
- `APP_ENV=production` with `REPOSITORY_ADAPTER=memory` fails production checks.
- `NODE_ENV=test` selects in-memory repositories for fast tests.
- Local development without `DATABASE_URL` may use memory only with explicit `REPOSITORY_ADAPTER=memory`.
