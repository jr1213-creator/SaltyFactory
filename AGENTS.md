# AGENTS.md — SaltyFactory Build Standard

## Purpose

This file is durable repo guidance for AI coding agents working on SaltyFactory.

SaltyFactory is a production-ready POD Business OS and SaaS-ready platform for building and operating AI-ready print-on-demand brands.

The core product promise is:

> AI-run, human-approved POD business infrastructure.

This repo must never become a generic storefront, a fake demo app, a local-only prototype, or an unsafe automation tool.

---

## Source of Truth

Before making major changes, read:

1. `saltyfactory-build-01-architecture.md`
2. `docs/mockups/`
3. `docs/00-product-vision.md`
4. `docs/01-architecture.md`
5. `docs/14-production-readiness-checklist.md`
6. `docs/15-build-checkpoint.md`

The architecture file is the locked guardrail source.

The mockups in `docs/mockups/` are the visual reference for the production UI.

If code conflicts with the locked architecture, fix the code or explicitly report the conflict.

---

## Staff Engineer Build Standard

Breadth without depth is a defect. A feature is not complete because routes, tables, docs, or UI panels exist; it is complete only when the full user-triggered path is walkable and verified.

Apply these rules before calling any feature done:

1. Finish one vertical slice before moving to the next: real browser action -> UI call -> API route -> provider action or honest provider block -> database write -> downstream read.
2. No orphaned code: every backend route touched or added must have a real UI caller, and every UI action must call a real backend route or be visibly disabled with a specific reason.
3. No silent partial implementations: incomplete provider/interface methods must fail loudly and specifically, not inherit a generic success-looking fallback.
4. Test success paths, not only blocked paths: each feature needs at least one test with realistic mocked provider output and assertions on persisted side effects.
5. Docs describe verified reality only: do not call intended behavior functional until the UI -> API -> DB/provider -> downstream path has been verified.
6. Prefer readable, reviewable code over dense one-liners or compressed logic.
7. Do not silently resolve conflicts with locked guardrails. Report the conflict, the options, and the safest recommendation.
8. Run this Definition of Done before reporting completion:
   - A real user can trigger it through the actual UI.
   - UI actions call real backend routes.
   - External provider calls are real or visibly config-blocked with exact setup requirements.
   - Production-capable paths persist through the repository/database layer.
   - The next pipeline stage can read what was written.
   - At least one success-path test asserts real side effects.
   - No involved method, class, or route silently falls back to a misleading stub.
   - No dead code or abandoned parallel implementation remains.
   - Docs match verified behavior.
   - The full flow has been walked as a user would experience it, or the unverified gap is explicitly reported.

---

## AI Software Factory Prompt Standard

All AI coding agents must follow `docs/standards/ai-software-factory-prompt-standard-v1.md` before implementing feature work.

Non-negotiables:

- no fake completion
- no orphaned routes
- no fake provider success
- no secret leakage
- no AI self-authority
- tests required
- docs must match reality

---

## Product Scope

SaltyFactory must support:

- Public POD storefronts
- Private Studio/admin app
- AI employees
- Trend-to-product pipeline
- Design generation workflow
- Image QA and mockup workflow
- Product draft builder
- Shopify integration
- Printify integration
- Analytics and metrics intelligence
- SEO / AEO / GEO / AI-readiness scoring
- Public AI site tools, safely configured
- Marketing campaign drafts
- Customer support assistant drafts
- Billing/subscription readiness
- Workspace-based SaaS model
- Production database persistence
- Auth protection
- Audit events
- Human approval gates

Core positioning:

> Launch and operate an AI-ready POD brand with storefront, fulfillment, marketing, analytics, and AI employees built in.

Do not use guaranteed-income, passive-income, or get-rich-quick claims.

---

## Non-Negotiable Guardrails

Never add:

- OpenAI dependency
- Anthropic dependency
- OpenAI provider
- Anthropic provider
- Public AI generation endpoint
- Public publish endpoint
- API token in frontend bundle
- Supabase service role key in frontend
- Shopify Admin token in frontend
- Printify token in frontend
- HuggingFace token in frontend
- Google private key in frontend
- Ad provider token in frontend
- Raw provider tokens stored in database
- Production path using in-memory persistence
- Auth bypass in production
- Live product publishing without all gates and human approval
- Automatic ad spend
- Automatic SEO/product publishing from recommendations
- Automatic legal/trademark clearance claims
- Private trend data on public storefront
- Generation prompts on public storefront
- Unapproved products on public storefront
- Unapproved images/assets on public storefront
- Fake production products
- Fake production orders
- Fake customer PII
- Scammy passive-income claims

---

## Production Persistence Rules

Production must use Drizzle/Postgres through the repository factory.

Memory repositories are allowed only for tests or explicit development fixtures.

Rules:

- `NODE_ENV=test` may use memory repositories.
- `APP_ENV=development` may use memory only if explicitly configured.
- `APP_ENV=production` must never use memory repositories.
- `APP_ENV=production` requires `DATABASE_URL`.
- Studio, worker, API routes, and storefront data paths must use the repository factory.
- Do not import memory repositories directly in app runtime code.
- Workspace-owned repository methods must require `workspace_id`.
- Cross-workspace reads are defects.

Required checks:

```txt
corepack pnpm check:production
corepack pnpm check:guardrails
```

must fail if production can use in-memory persistence.

---

## Workspace Isolation

Every business object must be workspace-aware unless it is truly global system configuration.

Workspace-owned records must include or resolve:

- `workspace_id`
- `organization_id` where applicable
- actor/audit context for writes

Studio actions must verify workspace access.

Public storefront routes may only read approved public projections.

Private factory data must never appear publicly.

---

## Auth Rules

Studio must be protected.

Studio auth standard:

Production Studio auth must use Supabase Auth with email verification / magic-link minimum. Do not implement custom password auth, custom password hashes, email-only authentication, env-only authentication, or custom signed Studio session cookies as production auth. Supabase Auth owns identity; Studio access also requires server-side workspace/role authorization through the SaaS membership model.

Required behavior:

- `/studio/*` unauthenticated browser navigation redirects to `/login`
- `/api/studio/*` unauthenticated requests return 401/403 JSON
- no red Next.js runtime error for normal unauthenticated Studio navigation
- no production auth bypass
- audit actor captured for create/update/approve/reject/publish actions

Do not weaken auth to fix UX.

---

## Publishing Rules

Publishing is always human-approved and gate-checked.

Required helpers:

```ts
evaluatePublishReviewGates()
assertPublishAllowedForShopify()
assertPublishAllowedForPrintify()
createBlockedPublishEvaluation()
```

Nothing can publish/sync unless:

```txt
human_approved=true
risk_checks_passed=true
print_file_qa_passed=true
margin_checks_passed=true
mockups_complete=true
title_reviewed=true
description_reviewed=true
tags_reviewed=true
printify_variants_valid=true
shopify_collection_assigned=true
workspace_provider_connection_valid=true
```

Rules:

- any false gate blocks
- inconsistent allowed flags are rejected
- live publishing is disabled by default
- Shopify creates draft by default
- Printify sync is guarded
- every publish attempt is audited
- failed publish attempts are audited
- AI employees cannot override approval gates

---

## AI Employee Rules

AI employees are role-based workflow assistants, not autonomous free-for-all bots.

Required employee categories include:

- Trend Scout
- Product Strategist
- Phrase Assistant
- Risk Reviewer
- Design Assistant
- Image Production Assistant
- Listing Manager
- Margin Manager
- Publishing Assistant
- Marketing Assistant
- Customer Support Assistant
- SEO Specialist
- AEO Specialist
- GEO Specialist
- Analytics Analyst

AI employee outputs are drafts unless human-approved.

AI employees may not:

- publish live products automatically
- spend ad budget automatically
- send customer support automatically
- auto-clear trademark/IP risk
- expose private data publicly
- expose prompts or secrets
- use unapproved products in public site tools

---

## Provider Rules

All providers default disabled.

Provider execution requires:

- explicit feature flag
- required token/config
- server-side context
- workspace authorization
- sanitized errors
- audit event for meaningful actions

Provider categories:

- Shopify Storefront
- Shopify Admin
- Printify
- HuggingFace-compatible text/image
- Background removal
- Upscale
- GA4
- Google Search Console
- Google Ads
- Meta Ads
- Pinterest
- TikTok
- Klaviyo
- Supabase Storage
- Stripe, if enabled

No provider may become enabled just because a token exists. The explicit flag must also be true.

Missing credentials should create a typed disabled/missing-config state, not fake success.

---

## Storage Rules

Use private storage for generated/unapproved assets.

Use public storage only for approved product assets.

Rules:

- private generated assets require signed URLs
- public URLs only for approved assets
- raw prompts never public
- trend signals never public
- unapproved product images never public
- service role key server-side only

---

## Public Storefront Rules

The storefront must be premium, fast, AI-ready, and safe.

Required public routes include:

```txt
/
/collections
/collections/[slug]
/products/[handle]
/cart
/search
/drops
/drops/[slug]
/about
/size-guide
/faq
/legal/privacy
/legal/terms
/llms.txt
/sitemap.xml
/robots.txt
```

Storefront may show:

- approved public product projections
- approved product images
- brand summary
- collection summaries
- product fact blocks
- FAQ answers
- size/shipping/return facts
- structured data

Storefront must never show:

- private trend signals
- generation prompts
- audit internals
- provider secrets
- unapproved products
- unapproved assets
- private analytics
- Studio-only data

---

## UI Standards

Use the mockups in `docs/mockups/` as the visual target.

The UI should feel:

- cleaner than Amazon seller tools
- more modern than CNET
- closer to Linear/Vercel/Shopify-level quality
- premium, calm, and serious
- coastal/western inspired without looking childish

Do not use screenshots as backgrounds.

Build real responsive components.

Primary font:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Studio should use:

- white surfaces
- soft blue-gray background
- deep navy text
- teal primary actions
- warm sand/coastal accents
- rounded cards
- subtle shadows
- professional tables/charts
- score cards
- approval gate panels
- AI employee cards
- provider status cards

Storefront should feel like a premium POD brand, not a generic template.

---

## Required Shared UI Components

Prefer reusable components in `packages/ui`.

Core components should include or evolve toward:

```txt
StudioShell
StudioSidebar
StudioTopbar
WorkspaceSwitcher
PageHeader
MetricCard
ChartCard
DashboardCard
DataTable
FilterBar
StatusBadge
ScoreBadge
RiskBadge
ProgressBar
ProgressRing
ProductCard
ProductGrid
ProductImageGallery
VariantSelector
PriceMarginPanel
ValidationChecklist
AiEmployeeCard
ApprovalGateList
AuditTimeline
RecommendationCard
ProviderStatusCard
IntegrationCard
AiReadinessScoreCard
SiteToolToggleCard
EmptyState
LoadingState
ErrorState
GuardrailPanel
```

Do not duplicate dashboard/card/table code page-by-page.

---

## AI Readiness / SEO / AEO / GEO Rules

SaltyFactory storefronts should be:

- human-readable
- search-readable
- AI-readable
- answer-engine-ready
- generative-engine-ready
- structured-data-rich
- conversion-ready
- measurable

Required structures:

- AI Readiness Score
- SEO Score
- AEO Score
- GEO Score
- Structured Data Score
- Content Quality Score
- Product Feed Score
- Technical Crawlability Score
- AI Tool Configuration Score
- Analytics/Measurement Score
- Conversion Readiness Score

Required public technical outputs:

- `/llms.txt`
- `/sitemap.xml`
- `/robots.txt`
- Product JSON-LD
- Organization JSON-LD
- Website JSON-LD
- Breadcrumb JSON-LD
- FAQ JSON-LD where appropriate

AI readiness recommendations are drafts and require human approval.

---

## Public AI Site Tools

Public AI site tools must be configurable from Studio and disabled by default.

Tool categories:

- AI Shopping Assistant
- AI Product Finder
- AI Size Assistant
- AI FAQ Assistant
- AI Recommendation Widget

Rules:

- approved public knowledge only
- no private trend data
- no prompts
- no unapproved products
- no invented policies
- no medical/legal/financial claims
- no guaranteed delivery dates
- rate-limited
- fallback when provider disabled
- no secrets in responses

---

## Analytics / Metrics Rules

Analytics feeds AI employees but does not auto-execute changes.

Provider categories:

- GA4
- Google Search Console
- Google Ads
- Shopify metrics
- Printify metrics
- Meta Ads
- Pinterest
- TikTok
- Klaviyo

Rules:

- analytics providers disabled by default
- no analytics secret in frontend
- import failures sanitized
- stale data marked stale
- recommendations require human approval
- no automatic ad launches
- no automatic SEO publishes
- no automatic product changes

---

## Billing Rules

Billing/subscription support must be SaaS-ready.

Plans may include:

- internal
- starter
- growth
- agency
- enterprise

Feature limits may include:

- workspaces
- products per month
- AI employee runs per month
- image generations per month
- connected stores
- team members
- storage
- analytics connections
- site AI tools

Stripe or other billing providers must be disabled by default unless explicitly configured.

No fake charges.

No Stripe secret in frontend.

---

## Development Commands

Use Corepack PNPM.

Run these before claiming completion:

```txt
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm check:guardrails
corepack pnpm check:secrets
corepack pnpm check:production
corepack pnpm db:generate
```

For app smoke tests:

```txt
corepack pnpm dev:storefront
corepack pnpm dev:studio
corepack pnpm dev:worker
```

Expected local URLs:

```txt
Storefront: http://localhost:3000
Studio: http://localhost:3001/login
```

Unauthenticated `/studio` should redirect to `/login`.

---

## Definition of Done

Do not claim completion unless:

1. Code is implemented, not only documented.
2. Existing tests pass.
3. New behavior has tests.
4. Build passes.
5. Guardrail checks pass.
6. Secret checks pass.
7. Production checks pass or fail only for real missing credentials with honest messages.
8. No forbidden dependency or endpoint was added.
9. No private data is exposed publicly.
10. Studio remains protected.
11. Production persistence is not in-memory.
12. Publish gates remain enforced.
13. Browser smoke tests are run for UI changes.
14. Remaining gaps are stated honestly.

Required completion report:

```txt
1. Summary
2. Files changed
3. Tests added/updated
4. Validation results
5. Smoke-test results if UI changed
6. Remaining gaps
7. Explicit confirmation of all relevant guardrails
```

---

## Manual Browser Smoke Test Checklist

For storefront UI work, verify:

```txt
http://localhost:3000
http://localhost:3000/collections
http://localhost:3000/cart
http://localhost:3000/search
http://localhost:3000/drops
http://localhost:3000/about
http://localhost:3000/size-guide
http://localhost:3000/faq
http://localhost:3000/llms.txt
http://localhost:3000/robots.txt
http://localhost:3000/sitemap.xml
```

For Studio UI/auth work, verify:

```txt
http://localhost:3001/login
http://localhost:3001/studio
http://localhost:3001/studio/trends
http://localhost:3001/studio/drafts
http://localhost:3001/studio/publish
http://localhost:3001/studio/analytics
http://localhost:3001/studio/ai-readiness
```

Expected:

- `/login` returns 200
- unauthenticated `/studio` redirects to `/login`
- no red runtime error for normal unauthenticated navigation
- protected routes do not expose data

---

## Review Culture

Do not hide gaps.

Do not fake success.

Do not describe placeholder code as production.

If blocked, report:

```txt
file
command
error
smallest safe fix
```

Fix real defects before adding unrelated features.

Prefer repair over explanation.

Prefer proof over claims.

---

## Project Standard Name

This repo follows:

> Spec-Anchored, Guardrail-Driven, Browser-Verified Agentic Development

In plain English:

> Big AI builds, controlled by a locked spec, visual mockups, hard forbidden rules, tests, production checks, browser smoke tests, and human checkpoints.
