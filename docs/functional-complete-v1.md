# SaltyFactory Functional Complete v1

SaltyFactory v1 is an AI-assisted ecommerce, POD, dropshipping, and business migration cockpit. It is built around real workspace-owned records, provider honesty, encrypted credential storage, and owner approval gates.

## Provider Status Definitions

- `connected`: a live provider call succeeded.
- `ready`: local prerequisites are complete for a safe internal action.
- `configured_not_verified`: configuration exists but no live verification has succeeded.
- `not_configured` / `setup_needed`: required env, credential, bucket, property, or workspace selection is missing.
- `disabled`: feature flag is off.
- `access_limited`: provider API/quota/permission is unavailable for a non-destructive read.
- `failed`: attempted action failed with a sanitized error.
- `blocked_by_guardrail`: action requires approval, provider configuration, or safety gates.

## Manual Setup Checklist

1. Complete `/studio/settings/business-profile`.
2. Add priority sales, social, reputation, and content channels at `/studio/channels`.
3. Connect Google in `/studio/integrations`, configure GA4 property ID, Search Console property, and GBP account/location, then sync each data source.
4. Verify Supabase Storage from `/studio/integrations`.
5. Create a baseline snapshot at `/studio/baseline`.
6. Configure AI employees at `/studio/ai-employees`.
7. Add POD migration candidates at `/studio/pod-migration`.
8. Add dropshipping candidates at `/studio/dropshipping`.
9. Create listing drafts at `/studio/listing-drafts`.
10. Use the margin calculator route before approving exports.
11. Create social content drafts at `/studio/social-planner`; publish manually only after owner approval.
12. Test Shopify and Printify only after credentials are configured.

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

The v1 adapter tests `shop.json` and creates draft products only after provider configuration, persisted product draft lookup, persisted publish review lookup, and publish gates pass.

## Printify Setup

Required env:

```txt
PRINTIFY_ENABLED=true
PRINTIFY_API_TOKEN=
PRINTIFY_SHOP_ID=
```

The v1 adapter can fetch shops, catalog blueprints, print providers, variants, and create draft products only after approval gates pass.

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

## Salty Cowhide POD Migration Workflow

1. Add legacy design/product candidates in `/studio/pod-migration`.
2. Attach or reference approved assets from the asset workflow.
3. Approve mockups from the mockup workflow.
4. Calculate margin and resolve blockers.
5. Create a listing draft.
6. Validate disclosure, safety, pricing, shipping notes, and owner approval.
7. Export JSON/CSV manually or use guarded Shopify/Printify draft sync when providers and gates pass.

## Owner QA Checklist

- Business profile setup saves and shows readiness blockers.
- Channels page accepts social/sales/reputation URLs and shows completeness.
- Google connect/test/configure/sync returns honest statuses.
- Baseline snapshot reports insufficient data when Google metrics are missing.
- AI employee configuration rejects forbidden actions.
- POD candidate creation shows design/mockup/listing/margin/approval blockers.
- Dropshipping candidate flags long shipping, low margin, and brand mismatch.
- Listing draft blocks Etsy POD disclosure and missing approved assets/mockups.
- Social planner creates drafts only and does not auto-post.
- Shopify/Printify draft sync blocks without provider configuration and publish gates.
- Guardrail script catches token exposure, fake metrics, and premature GBP write actions.

