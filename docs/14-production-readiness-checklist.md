# Production Readiness Checklist

Completed:
- Compact Drizzle schema replaced with full production schema.
- Base migration regenerated from the expanded schema.
- Workspace/SaaS tables implemented.
- AI employee tables implemented.
- Product pipeline tables implemented.
- Publish gate tables implemented.
- Repository layer expanded beyond stubs.
- Repository adapters split into Drizzle production repositories and memory test repositories.
- Runtime repository factory enforces Drizzle in production and forbids in-memory production persistence.
- Test suite expanded beyond 2 files / 12 tests.
- Guardrails verify no OpenAI dependency, no Anthropic dependency, no public AI generation endpoint, no public publish endpoint, no raw token DB columns, and live publishing disabled by default.

Still required before production operation:
- Configure production secrets and provider accounts.
- Apply migrations to a real Supabase Postgres database.
- Run `db:health` with `DATABASE_URL` present.
- Verify Shopify/Printify/HuggingFace provider health only after explicit flags and tokens are configured.
