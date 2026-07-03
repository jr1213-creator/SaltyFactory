# Provider Setup Guides v1

Status: implemented as structured setup guides in `packages/config/src/setup-guides.ts`.

Provider setup guides are owner-facing instructions for finding required provider values without exposing internal env-first implementation details.

## Printify

Fields:
- Printify API token
- Printify shop
- Printify publish permission

Owner path:
1. Open `/studio/onboarding/providers/printify`.
2. Read what Printify does and why it matters.
3. Open “Where do I get this?”
4. Paste the token in the write-only secure field.
5. Validate token server-side.
6. Discover shops.
7. Select the shop.

Required behavior:
- No PowerShell.
- No manual API calls.
- No fake upload IDs or product IDs.
- Live Printify publishing remains owner-gated.

## Shopify

Fields:
- Shopify store domain
- Shopify Admin token
- Shopify collection
- Shopify publish permission

Owner path:
1. Open `/studio/onboarding/providers/shopify`.
2. Enter the `.myshopify.com` domain.
3. Paste the Admin token in the write-only secure field.
4. Validate Admin access server-side.
5. Discover/select the default collection.

Required behavior:
- Draft creation does not publish.
- Admin token is never returned to the browser.
- Collection IDs are workspace-scoped.

## Image Generation

Fields:
- Image generation provider
- HuggingFace-compatible token
- model key
- local development mode

Owner path:
1. Open `/studio/onboarding/providers/image-generation`.
2. Choose real provider setup or local development preview.
3. Save token/model through server-side validation when credential storage is enabled.

Local demo mode:
- development only
- clearly labeled
- not treated as real provider success
- blocked in production

## Storage

Private media storage requires administrator setup because service-role credentials are server-only. Owner-facing UI must show:

- what is needed
- why it is needed
- who can complete it
- request-help action
- advanced deployment details only inside disclosure controls

## Banking / Novo / Plaid

Banking is read-only in v1.

Owner path:
- use manual import
- request Plaid setup if configured
- never paste bank login credentials

Novo direct API remains future unless a verified official API is configured.

## External Orders

Direct Staples/external order submission is future/disabled.

Owner path:
- generate print-ready packet
- view handoff instructions
- request concierge help

No order is placed, no checkout is submitted, and no payment is initiated.
