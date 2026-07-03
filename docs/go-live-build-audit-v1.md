# SaltyFactory Go-Live Build Audit v1

Source prompt: local owner-provided `SaltyFactory-Full-Go-Live-Build-Prompt.md`.

This audit records verified reality after commit `8e188e7` plus the current go-live route work. It does not claim the full go-live prompt is complete.

## Feature Area Status

| Area | Requirement | Current status | Evidence | Remaining work |
| --- | --- | --- | --- | --- |
| A | Replace Studio nav with two-tier POD sidebar + top dropdowns | Not complete | Current `StudioNavigation.tsx` is still a grouped left sidebar; no top dropdown IA cutover. | Rebuild Studio shell with POD-only sidebar and top dropdowns; crawl every Studio route. |
| B | Full Tailwind v4 + shadcn cutover; zero legacy style refs | Mostly complete for app/UI source | Tailwind v4 is installed for Studio and storefront, `packages/ui` uses shadcn-style `cn`/CVA/Radix Slot primitives, app globals use Tailwind tokens/layers, and the migration test scans `apps/studio`, `apps/storefront`, and `packages/ui`. | Authenticated visual QA and formal contrast reporting still require the browser-safe Supabase fixture. |
| C | Shopify/Printify go-live wiring | Partial | Added owner-gated `POST /api/studio/publish/shopify/[refId]/go-live` and UI caller on `/studio/shopify-products`; route fails closed unless flags and confirmation pass. | Verify against real Shopify credentials and real owner confirmation; add Printify-side live tracking only if needed. |
| D | Printify real mockup sync polling | Not complete | `PrintifyProviderLive.getProduct()` exists, but no post-create poll-with-backoff job stores returned Printify mockup URLs for Shopify media. | Add background polling job after Printify create; persist real Printify image URLs; feed them into Shopify media/draft creation. |
| E | Shopify GraphQL Admin API migration | Not complete | `ShopifyAdminProviderLive` still uses REST Admin endpoints. | Migrate create/update/media/collection/get/publish to GraphQL Admin API or document a specific technical blocker. |
| F | Numbered docs cleanup | Not complete / not applicable in current tree | `Get-ChildItem docs -Filter '[0-9][0-9]-*.md'` returned no numbered docs in this checkout. | No numbered boilerplate docs found to rewrite/delete in the current tree. |
| G | Authenticated Playwright fixture | Not complete | Playwright has unauthenticated route protection checks and axe on `/login`; authenticated Studio test remains skipped pending real Supabase session fixture. | Build browser-safe Supabase test account/session fixture and run authenticated route/visual/mobile checks. |

## Final Go-Live Gate

| Gate | Status | Notes |
| --- | --- | --- |
| Feature Areas A-G fully complete | Unchecked | Only Area C is partial; F appears already absent. |
| Zero legacy style references in app/UI source | Checked | `tests/frontend-tailwind-migration.test.ts` scans `apps/studio`, `apps/storefront`, and `packages/ui` for the legacy factory-prefixed selector namespace. |
| Zero broken nav links | Unchecked | Needs crawl after IA cutover. |
| WCAG AA token contrast ratios reported | Unchecked | Not run for requested token set. |
| Authenticated Playwright fixture passes full POD flow | Unchecked | Fixture missing by design; no auth bypass added. |
| Real product from idea to live Shopify with Printify catalog photo | Unchecked | Requires real configured providers, live flags, and owner confirmation. |
| Production env/secrets checklist documented | Checked | `docs/local-feature-config-v1.md` covers exact discovered env/config readiness. |
| No browser console/hydration errors on every route | Unchecked | Only unauthenticated protected routes and `/login` are browser-tested. |
| Mobile layout at 375px on every new IA route | Unchecked | Not run because IA/Tailwind cutover is not complete. |
| Build/lint/full test suite pass | Checked | Current slice passed lint, typecheck, full Vitest, production build, guardrails, secrets, production checks, DB generate/migrate, and frontend QA. |

## Current Safe Go-Live Behavior

Shopify live publish remains blocked by default. The go-live route requires:

- authenticated owner/admin publish permission
- persisted Shopify product ref
- persisted product draft and publish review
- publish gates passing
- `LIVE_PUBLISHING_ENABLED=true`
- `SHOPIFY_ALLOW_PRODUCT_PUBLISH=true`
- `SHOPIFY_ADMIN_ENABLED=true`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_TOKEN`
- explicit owner confirmation phrase: `PUBLISH LIVE`

If any of these are missing, the route returns a specific blocked/config response and writes provider/audit events where a persisted ref exists.
