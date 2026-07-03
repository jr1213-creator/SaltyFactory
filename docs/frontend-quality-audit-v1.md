# Frontend Quality Audit v1

Status: quality harness plus Studio IA shell polish implemented.

## Studio IA Polish

- Topbar now exposes primary command centers: Home, POD, AI, Business, Customer, Marketing, Setup.
- Sidebar now starts with active workflow context, breadcrumbs, next action, and setup access.
- POD launch stages stay visible as a stage rail: Plan, Generate, QA, Mockup, Price, Provider, Review.
- The full route inventory moved into a lower-priority module explorer so it remains available without dominating the first interaction.
- `/studio` now renders a Command Center Launchpad before metric tables.

## Page Classification

| Area | Classification | Evidence / next quality action |
|---|---|---|
| POD Launch Studio | Production-quality command center | Refactored into a high-density Tech-Spa command center with consumer-facing provider health, structured stat cards, launch stages, blocker intelligence, and a single priority pathway. Raw env-variable names are not shown on the dashboard. Needs authenticated Playwright screenshots once a browser-safe auth fixture exists. |
| Publish Review | Functional, provider-action wired | Printify/Shopify buttons call real backend routes and surface blockers. Needs visual regression baseline. |
| Printify Catalog | Functional, provider-config-blocked honestly | Catalog/variant actions are reachable. Needs authenticated browser fixture for interaction QA. |
| Shopify Products | Functional, status oriented | Draft refs render and media route exists. Needs richer empty state screenshots. |
| POD Batches | Functional foundation | 15-item batch records and retry exist. Needs visual baseline for partial failure state. |
| AI Employees | Functional but dense | Hiring/improvement/model registry routes are connected. Needs component-level Storybook review. |
| Business Command Center | Functional decision-support | Strong internal APIs and routes. Needs visual regression on dashboard and profile. |
| Business Documents / Print Studio | Manual/export-ready | Business-card preview/export manifests exist. Needs pixel baseline for card preview. |
| Banking / Novo / Plaid | Read-only/manual foundation | Honest blocked/read-only states. No money movement UI. |

## Harness Added

- Storybook config in `.storybook/`.
- Component stories in `packages/ui/src/frontend-quality.stories.tsx`.
- Playwright config in `playwright.config.ts`.
- Browser protection spec in `e2e/studio-frontend-quality.spec.ts`.
- Frontend QA docs and scripts: `storybook`, `storybook:build`, `frontend:qa`.
- Authenticated Playwright storage-state generator: `corepack pnpm frontend:auth-setup`.
- Authenticated QA runner: `corepack pnpm frontend:qa:auth`.

Authenticated Playwright route rendering now runs when `STUDIO_E2E_STORAGE_STATE` points to a browser-safe Supabase Playwright storage-state file. Without that fixture, authenticated route rendering is skipped so screenshots are not produced from a fake auth path.

## Authenticated Studio QA

Use a dedicated Supabase Auth test user, not Jennie's personal browser session. The test user must have a real Studio workspace membership in the configured local/dev database.

Required local env names:

- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `STUDIO_E2E_EMAIL`
- `STUDIO_E2E_PASSWORD`
- `STUDIO_E2E_BASE_URL`, default `http://localhost:3001`
- `STUDIO_E2E_STORAGE_STATE`, default `test-results/studio-auth-state.json`

Run:

```txt
corepack pnpm frontend:auth-setup
corepack pnpm frontend:qa:auth
```

The generator signs in through Supabase using the public anon flow and writes local Playwright cookies for the dedicated test account. It refuses production runtime, does not use the service-role key, and does not create a production auth bypass. If the test credentials are missing, it fails honestly and authenticated route rendering remains skipped.

## Regression Coverage

The route and browser tests now protect against:

- `/studio` concatenated metric strings such as `100%Profile completeness`.
- raw provider/database env var leakage outside `/studio/setup`.
- orphaned `Find Search disabled` or `Search disabled` header text.
- visible desktop scrollbar under the top command-center navigation.
- crowded POD pipeline labels such as `Launch statePrintify`.
- missing next-action buttons in Shopify/POD empty states.
- setup cards displaying secret-looking values instead of env var names only.
