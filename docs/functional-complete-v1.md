# SaltyFactory Functional Complete v1

SaltyFactory v1 is an AI-run, human-approved POD business operating system for launching and operating SaltyCowhide.com. It is built around real workspace-owned records, provider honesty, encrypted credential storage, Guided Setup Concierge onboarding, AI employee draft workflows, and owner approval gates.

## Customer Setup Rule

Customers do not edit `.env` files, text files, or developer config to use SaltyFactory. The owner-facing setup path is:

- `/studio/onboarding`
- `/studio/onboarding/guided`
- `/studio/onboarding/quick-start`
- provider setup pages under `/studio/onboarding/providers`
- `/studio/setup` owner-friendly mode

Developer/server env configuration remains only for local development, CI, and deployment administration. Env names may appear in Advanced / Developer details and docs, not as the primary owner UX.

## No Dead Config States

Every setup blocker must include a plain-English explanation, next action, setup guide, validation route when applicable, request-help path, and no secret values. If a setting requires administrator/server setup, Studio must say so and provide a help request path.

## Functionality Truth Table

| Module | Status | Current truth |
|---|---|---|
| AI Employees | Fully functional v1 | Owner-triggered runs persist AI run/output records, create shared approval records, support approve/reject/needs-edits/convert-to-task, and materialize supported outputs into internal POD records. No provider action is executed by approval. |
| Product Builder | Fully functional v1 | `/studio/product-builder` shows persisted POD product ideas from manual creation or approved AI product-idea outputs. `/studio/pod-migration` remains a compatibility alias. |
| Designs | Provider-backed when configured | Deterministic design suggestions and persisted AI design concept outputs are visible for owner review. Image generation is core workflow and blocks with exact setup requirements until an allowed image provider is configured. |
| Assets | Fully functional v1 | Generated image bytes from the worker persist as private design assets, QA can run, and approve/reject/mockup handoff is persisted. Manual references are not the core production path. |
| Mockups | Fully functional v1 | Internal Sharp compositing creates private mockup images from approved generated artwork and template art zones. Provider mockup retrieval remains future integration. |
| Listing Drafts | Fully functional v1 | Create/edit listing drafts, validation blockers, owner approval status, and export payloads persist. No Shopify/Etsy/Printify sync is implied. |
| Pricing & Margins | Fully functional v1 | Manual cost/shipping/price inputs calculate margin and can persist price-margin checks against product drafts. No fake Printify cost is imported. |
| Publish Review | Provider-backed draft actions | `/studio/publish-review` computes gates from persisted evidence, shows blockers/provider readiness, and exposes real "Send to Printify" and "Create Shopify Draft" actions. Approval alone does not publish or sync. |
| Customer Command Center | Fully functional v1 | Workspace-owned customers, leads, notes, tasks, timeline events, forms, and readiness summaries persist through CRM repositories. |
| Capture Forms | Honest foundation | Capture form records and submissions/consent foundations exist. Public embeds and external email automation remain future integrations unless explicitly implemented and verified. |
| Marketing Command Center | Fully functional v1 | Guided launch campaign workflow creates persisted product-referenced campaign packets, proof packs, growth plans, channel drafts, asset specs, UTMs, tasks, recommendations, and approvals. |
| Approvals | Fully functional v1 | Shared approvals cover marketing and AI employee outputs; approval pages expose real controls and audit/event records. |
| Social Care | Manual/export-ready | Manual/imported social opportunities create source records, response notes, tasks, events, and audit logs. No live social provider inbox or reply sending is active. |
| Shopify/Printify | Provider-backed draft creation when configured | Shopify Admin draft creation supports media, variants, SEO, update, get, and required collection assignment by real collection ID. Printify supports shop discovery, catalog/provider/variant/shipping discovery, image upload, print areas, product creation, and product retrieval. All actions block without exact server-side config, gates, and owner permission. Live publishing is still blocked by default. |
| Google/Merchant/Search/Analytics | Honest foundation | Setup, OAuth/configuration helpers, readiness scoring, and sanitized sync/test paths exist. No fake analytics, ranking guarantees, or feed submission. |
| Email/Social/Ads | Manual/export-ready | Drafts and campaign packets persist for manual/export use. Sending, posting, ad launch, and spend are not implemented. |
| AI Hiring Desk | Owner-gated functional v1 | Missing-capability proposals create persisted hire requests, role specs, approvals, audit events, permission scopes, and employee definitions only after owner approval. New AI employees inherit global forbidden actions and receive no provider authority. |
| AI Continuous Improvement Desk | Owner-gated functional v1 | AI employees and users can persist improvement, capability, training, tool-access, and handoff feedback requests. Suggestions can convert to tasks/hire/capability requests, but cannot self-implement or self-grant authority. |
| AI Model Runtime Registry | Partial / owner-gated | Model providers, models, assignments, evals, and usage events persist. Low-risk tasks can route to approved configured local/open models; sensitive/high-authority tasks block without authority approval; dangerous actions never route to models. Hosted/premium text generation adapters remain disabled/future unless explicitly configured and approved. |
| Business Command Center | Functional decision-support v1 | Business metrics, unit economics, opportunities, decision memos, forecasts, experiments, channel readiness, and batch/campaign/product conversions persist with assumptions and owner decisions. It is not accounting, tax, legal, investment, or money-movement software. |
| Business Identity / Banking / Document Ops | Manual and authority-gated v1 | Business profiles, goals, mantras, sensitive field references, authority requests, manual bank imports, document drafts, business card SVG packets, Staples handoff packets, and Make Me Look Legit bundles persist. Novo direct API and Plaid are blocked until configured/verified. No bank credentials, transfers, payments, or external order submission are implemented. |
| Launch Setup Concierge | Functional owner-facing setup v1 | `/studio/onboarding`, Guided Setup, Quick Setup, provider setup pages, setup field guides, provider validation routes, masked credential status, and setup help requests are implemented. Owner-entered secrets are stored only when encrypted credential storage is enabled; otherwise routes block with administrator setup required. |

## Customer Command Center

Customer Command Center v1 is the native customer success foundation for SaltyCowhide.com.

- Route: `/studio/customer-command-center`
- Related routes: `/studio/customers`, `/studio/customer-segments`, `/studio/customer-capture`, `/studio/customer-inbox`, `/studio/customer-campaigns`, `/studio/customer-intelligence`, `/studio/customer-scheduling`, `/studio/leads`, `/studio/opportunities`, `/studio/service-cases`
- APIs: `/api/studio/customer-command-center/summary` and `/api/studio/crm/*`
- Docs: `docs/customer-command-center-v1.md`

This module is functional for workspace-owned CRM records, default definitions, source labels, rule-based next actions, and honest readiness/empty states. Live Shopify customer/order sync, email/SMS sending, live support inboxes, public embed scripts, customer behavior tracking, and calendar sync require future provider integrations and must not be claimed as active until implemented and verified.

## Shared Kernel

Shared-kernel v1 is documented in `docs/shared-kernel-v1.md`.

It provides provider readiness, source provenance, owner-facing events, audit log, approvals, polymorphic tasks/notes, recommendations, readiness scores, export packages, asset specs, templates, automation rules, saved segments, and vertical packs. These primitives are used by Customer and Marketing workflows instead of module-specific duplicate tables.

## Marketing Command Center

Marketing Command Center v1 is documented in `docs/marketing-command-center-v1.md`.

- Routes: `/studio/marketing-command-center`, `/studio/marketing-campaigns`, `/studio/marketing-command-center/launch-campaign`, `/studio/marketing/pinterest`, `/studio/marketing/social`, `/studio/marketing/email`, `/studio/marketing/ads`, `/studio/marketing/ads/google`, `/studio/marketing/ads/meta`, `/studio/marketing/search-visibility`, `/studio/marketing/assets`, `/studio/marketing/tracking`, `/studio/marketing/research`, `/studio/marketing/social-care`, `/studio/marketing/approvals`, `/studio/marketing/setup`
- APIs: `/api/studio/shared/*`, `/api/studio/marketing/launch-campaign`, `/api/studio/marketing/utm-links`, `/api/studio/marketing/search-visibility/audit`, `/api/studio/marketing/social-care`
- Functional: campaign CRUD, editable channel drafts, guided campaign packet generation, Campaign Proof Pack, No-Ad Growth Plan, Ad Readiness Score, UTM generation, asset specs, source-labeled research, manual Social Care Opportunity records, approval queue, vertical pack seed/settings.
- Manual/export-ready: Pinterest pins, social posts, email drafts, Google Ads drafts, Meta Ads drafts, campaign asset specs, search/AEO/GEO reports.
- Future integrations: live social publishing, email sending, ad APIs, campaign analytics, external crawling, generated creative media.

## Provider Status Definitions

- `connected`: a live provider call succeeded.
- `ready`: local prerequisites are complete for a safe internal action.
- `configured_not_verified`: configuration exists but no live verification has succeeded.
- `not_configured` / `setup_needed`: required env, credential, bucket, property, or workspace selection is missing.
- `disabled`: feature flag is off.
- `access_limited`: provider API/quota/permission is unavailable for a non-destructive read.
- `failed`: attempted action failed with a sanitized error.
- `blocked_by_guardrail`: action requires approval, provider configuration, or safety gates.
- `external_signup_required`: the owner must create/open the provider account on the provider website.
- `manual_action_required`: the owner must complete a manual provider, DNS, domain, email, verification, or protected-config step.
- `prompt_draft`: the system created an internal prompt only; no image provider generated an asset.
- `mockup_pending`: artwork/product prerequisites are ready but product preview mockups are still pending.

## Launch Command Center

Primary route:

```txt
/studio/account-center
```

The Salty Cowhide Launch Command Center shows required, recommended, and optional launch cards for:

- Business Foundation
- Commerce
- Product Workflow
- Google / Discovery
- Launch Infrastructure
- AI Employees
- Operations
- Analytics

Cards explicitly distinguish:

- product-creation blockers
- launch/publish blockers
- owner actions
- external signup requirements
- manual DNS/email/domain/verification steps
- optional online-only Google Business Profile readiness

Recommended or optional setup, such as Google Business Profile for online-only POD, must not falsely block product creation.

## Manual Setup Checklist

1. Open `/studio/account-center`.
2. Complete `/studio/settings/business-profile`.
2. Add priority sales, social, reputation, and content channels at `/studio/channels`.
3. Connect Google in `/studio/integrations`, auto-detect or create setup for SaltyCowhide.com, configure GA4/Search Console/Merchant Center where available, then sync/test.
4. Create or open Shopify and Printify accounts externally, keep credentials server-side, then test providers from Account Center or Integrations.
5. Verify Supabase Storage from `/studio/integrations`.
6. Run AI Employees from `/studio/ai-employees` to create safe internal trend, product, design, image prompt, listing, pricing, social, and launch-readiness drafts.
7. Create or approve Product Ideas at `/studio/product-builder`.
8. Upload/approve artwork assets at `/studio/assets`.
9. Create or retrieve product mockups at `/studio/mockups`.
10. Create listing drafts at `/studio/listing-drafts`.
11. Use `/studio/pricing-margins` before approving exports.
12. Create social content drafts at `/studio/social-planner`; publish manually only after owner approval.
13. Create a baseline snapshot at `/studio/baseline`.

## Google Setup

Enable these Google Cloud APIs:

- Google Analytics Data API
- Google Search Console API
- Business Profile Account Management API
- Business Information API
- Business Profile Performance API
- Google My Business API for reviews

Local OAuth redirect URI:

```txt
http://localhost:3001/api/studio/integrations/google/oauth/callback
```

Scopes requested:

```txt
openid
email
profile
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/webmasters.readonly
https://www.googleapis.com/auth/business.manage
```

Env:

```txt
GOOGLE_INTEGRATIONS_ENABLED=true
GOOGLE_ANALYTICS_ENABLED=true
GOOGLE_SEARCH_CONSOLE_ENABLED=true
GOOGLE_BUSINESS_PROFILE_ENABLED=true
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
```

## Supabase Storage Setup

Required server-side env:

```txt
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PRIVATE_ASSETS_BUCKET=saltyfactory-private-assets
SUPABASE_PUBLIC_ASSETS_BUCKET=saltyfactory-public-assets
```

Private generated assets must use signed URLs. Public URLs are only created for approved assets.

## Shopify Setup

Owner setup:

- `/studio/onboarding/providers/shopify`
- Store domain
- Shopify Dev Dashboard Client ID
- Shopify Client Secret as a write-only secure field
- Default Shopify collection after discovery

Advanced protected server config:

```txt
SHOPIFY_ADMIN_ENABLED=true
SHOPIFY_STORE_DOMAIN=
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
# legacy only if Shopify exposes an Admin API access token:
SHOPIFY_ADMIN_TOKEN=
```

Account Center state:

- `external_signup_required` when no store domain or provider setup exists.
- `manual_setup_required` when the Shopify domain or Client ID/Secret must be saved through onboarding or protected server config.
- `configured_not_verified` until a live Admin API test succeeds.
- `connected` only after a live API test succeeds.

The v1 adapter tests `shop.json` and creates draft products only after provider configuration, persisted product draft lookup, persisted publish review lookup, owner permission, and publish gates pass. Dev Dashboard credentials are exchanged server-side before Admin API calls. Draft payloads include title, description, vendor, product type, tags, SEO metadata, variants/pricing, approved mockup media, and a real Shopify collection ID for collection assignment. Shopify setup exposes metafield keys only, never the Client Secret, legacy Admin token, or generated access token.

## Printify Setup

Required env:

```txt
PRINTIFY_ENABLED=true
PRINTIFY_API_TOKEN=
PRINTIFY_SHOP_ID=
```

Account Center state:

- `external_signup_required` when the owner must create/open a Printify account or generate a server-side API token.
- `manual_setup_required` when `PRINTIFY_SHOP_ID` must be set from a real discovered shop.
- `configured_not_verified` until a live API test succeeds.
- `connected` only after a live API test succeeds.

The setup route can discover real shops using the server-side token and returns sanitized shop candidates only. The v1 adapter can fetch shops, catalog blueprints, print providers, variants, shipping snapshots, upload approved generated artwork to Printify media, build print areas, create draft products, and retrieve products only after approval gates pass.

## Domain, DNS, Email, and Merchant Feed Readiness

Account Center generates manual DNS records for:

- Shopify domain connection
- Search Console verification
- Merchant Center website claim
- SPF
- DKIM where provided
- DMARC
- IndexNow key verification

Manual mode is the default. SaltyFactory does not overwrite DNS records unless a future provider adapter is explicitly configured and the owner approves the specific write.

Email readiness tracks support email, sending domain, SPF, DKIM, DMARC, transactional provider status, and sender verification. It improves launch trust but does not block POD product creation.

Merchant product feed readiness tracks Merchant Center verification, approved listings, approved mockups, price, shipping, tax, and policy prerequisites. Feed submission is disabled until explicit owner approval and provider gates pass.

## AI Provider Setup

Rules-based fallback is available when no model provider is configured and is labeled `rules_based`.

Hugging Face text/image calls require:

```txt
AI_TEXT_ENABLED=true
AI_IMAGE_ENABLED=true
HF_API_TOKEN=
HF_TEXT_MODEL=
HF_IMAGE_MODEL=
```

Model outputs are labeled `model_generated`. Prompts are screened for secrets, prompt-injection patterns, and trademark-risk phrases.

## Approval Gates

No live publish/sync can proceed unless the existing publish review gates pass:

- human approved
- risk checks passed
- print file QA passed
- margin checks passed
- mockups complete
- title/description/tags reviewed
- Printify variants valid
- Shopify collection ID assigned through the provider route
- provider connection valid

## Salty Cowhide POD Product Builder Workflow

1. Run AI Employees or manually create Product Ideas in `/studio/product-builder`.
2. Create design concepts and print artwork prompts.
3. Generate artwork only when an allowed image provider is configured and the owner has approved the prompt. If not configured, the workflow blocks with `AI_IMAGE_ENABLED=true`, `HF_API_TOKEN`, and `HF_IMAGE_MODEL`.
4. Persist generated image bytes as private assets, run asset QA, and approve artwork before product use.
5. Select real Printify blueprint/provider/variants, upload approved generated artwork to Printify media, and create/retrieve Printify draft products when Printify is configured.
6. Approve mockups from the mockup workflow.
7. Create listing drafts.
8. Calculate margin in `/studio/pricing-margins` and resolve blockers.
9. Validate disclosure, safety, pricing, shipping notes, approved artwork, approved mockups, and owner approval.
10. Review `/studio/publish-review`; export JSON/CSV manually or use guarded Shopify/Printify draft sync only when providers and gates pass.

## Owner QA Checklist

- Business profile setup saves and shows readiness blockers.
- Account Center shows product-creation blockers, launch blockers, Shopify/Printify setup state, DNS/email readiness, Merchant feed readiness, and approval queue state.
- Channels page accepts social/sales/reputation URLs and shows completeness.
- Google connect/test/configure/sync returns honest statuses.
- Google Business Profile stays optional for online-only Salty Cowhide POD unless an eligible local presence is selected.
- Baseline snapshot reports insufficient data when Google metrics are missing.
- AI employee configuration rejects forbidden actions and AI runs produce drafts/approval items only.
- Product Idea creation shows design/mockup/listing/margin/approval blockers.
- Artwork assets are not treated as product mockups.
- Dropshipping candidate flags long shipping, low margin, and brand mismatch.
- Listing draft blocks Etsy POD disclosure and missing approved assets/mockups.
- Social planner creates drafts only and does not auto-post.
- Shopify/Printify draft sync blocks without provider configuration and publish gates.
- `/studio/publish-review` buttons call `/api/studio/publish/printify` and `/api/studio/publish/shopify`.
- `/studio/printify-catalog` calls real Printify shop, catalog, provider, variant, shipping, selection, and upload routes.
- `/studio/shopify-products` calls the Shopify media upload route for existing draft refs.
- Guardrail script catches token exposure, fake metrics, and premature GBP write actions.
