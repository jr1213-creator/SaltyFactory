# 07-ai-free-provider-boundaries

This document reflects the implemented SaltyFactory v1 code in this repository. The app is a pnpm monorepo with Next.js storefront, auth-gated Studio, worker, Drizzle/Supabase Postgres schema, Supabase Storage provider boundary, disabled-by-default external providers, fail-closed publish gates, audit repositories, and production validation scripts. Live publishing, paid AI, public generation, and public publish endpoints are not implemented. Production setup requires real managed Postgres/Supabase, Shopify, Printify, and optional HuggingFace credentials in environment variables.

