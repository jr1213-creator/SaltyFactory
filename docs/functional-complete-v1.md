# SaltyFactory Functional Complete v1

SaltyFactory v1 is an AI-run, human-approved POD business operating system for launching and operating SaltyCowhide.com. It is built around real workspace-owned records, provider honesty, encrypted credential storage, provider setup guidance, AI employee draft workflows, and owner approval gates.

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
7. Create or approve Product Ideas at `/studio/pod-migration`.
8. Upload/approve artwork assets at `/studio/assets`.
9. Create or retrieve product mockups at `/studio/mockups`.
10. Create listing drafts at `/studio/listing-drafts`.
11. Use the margin calculator route before approving exports.
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

Required env:

```txt
SHOPIFY_ADMIN_ENABLED=true
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_TOKEN=
```

Account Center state:

- `external_signup_required` when no store domain or provider setup exists.
- `manual_setup_required` when the Shopify domain or Admin API token must be configured server-side.
- `configured_not_verified` until a live Admin API test succeeds.
- `connected` only after a live API test succeeds.

The v1 adapter tests `shop.json` and creates draft products only after provider configuration, persisted product draft lookup, persisted publish review lookup, and publish gates pass. Shopify setup exposes metafield keys only, never the Admin token.

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

The setup route can discover real shops using the server-side token and returns sanitized shop candidates only. The v1 adapter can fetch shops, catalog blueprints, print providers, variants, and create draft products only after approval gates pass.

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
- Shopify collection assigned
- provider connection valid

## Salty Cowhide POD Product Builder Workflow

1. Run AI Employees or manually create Product Ideas in `/studio/pod-migration`.
2. Create design concepts and print artwork prompts.
3. Generate artwork only when an image provider is configured and owner-approved, or upload artwork manually.
4. Run asset QA and approve artwork before product use.
5. Select Printify targets and create/retrieve product mockups when Printify is configured.
6. Approve mockups from the mockup workflow.
7. Create listing drafts.
8. Calculate margin and resolve blockers.
9. Validate disclosure, safety, pricing, shipping notes, approved artwork, approved mockups, and owner approval.
10. Export JSON/CSV manually or use guarded Shopify/Printify draft sync when providers and gates pass.

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
- Guardrail script catches token exposure, fake metrics, and premature GBP write actions.
