# Frontend Quality Audit v1

Status: partial quality harness implemented.

## Page Classification

| Area | Classification | Evidence / next quality action |
|---|---|---|
| POD Launch Studio | Functional, workflow-connected | Provider health, pipeline board, and blockers exist. Needs authenticated Playwright screenshots once a browser-safe auth fixture exists. |
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

Authenticated Playwright route rendering now runs when `STUDIO_E2E_STORAGE_STATE` points to a browser-safe Supabase Playwright storage-state file. Without that fixture, authenticated route rendering is skipped so screenshots are not produced from a fake auth path.
