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
- Shopify Client ID
- Shopify Client Secret
- Legacy Shopify Admin token, advanced only if Shopify exposes one
- Shopify collection
- Shopify publish permission

Owner path:
1. Open `/studio/onboarding/providers/shopify`.
2. Enter the `.myshopify.com` domain.
3. Paste the Shopify Dev Dashboard Client ID.
4. Paste the Client Secret in the write-only secure field.
5. Validate credentials server-side. SaltyFactory exchanges them server-side for an Admin access token, calls `shop.json`, and discovers collections.
6. Select the default collection from discovered Shopify collections.

Legacy path:
- Use Advanced / Legacy only if Shopify shows an installed custom-app Admin API access token.
- Do not hunt for an Admin token when the Shopify Dev Dashboard shows Client ID and Client Secret.

Required behavior:
- Draft creation does not publish.
- Client Secret, legacy Admin token, and generated Admin access token are never returned to the browser.
- Token exchange never runs in browser code.
- Collection IDs are workspace-scoped.

## Image Generation

Fields:
- Image generation provider
- Hugging Face token with `Make calls to Inference Providers`
- model key
- local development mode

Owner path:
1. Open `/studio/onboarding/providers/image-generation`.
2. Use local demo mode only for the fastest local development/test preview, or choose the real Hugging Face provider path.
3. For the real provider path, create a fine-grained Hugging Face token with `Make calls to Inference Providers`.
4. Use a recommended text-to-image model for the selected HF Inference provider path.
5. Save token/model through server-side validation when credential storage is enabled.

Current recommended HF Inference text-to-image models:
- `black-forest-labs/FLUX.1-schnell`
- `stabilityai/stable-diffusion-3-medium-diffusers`

Do not silently assume `stabilityai/stable-diffusion-xl-base-1.0` works through the current `hf-inference` router path. The UI should recommend the models above and the validation route returns `model_not_supported` for that old default.

Local demo mode:
- development only
- test only
- clearly labeled
- not treated as real provider success
- blocked in production

Image validation statuses:
- `token_missing`: no token was pasted or saved.
- `token_invalid`: Hugging Face rejected the token.
- `permission_missing`: token lacks Inference Providers permission.
- `model_not_found`: model ID is missing or not found.
- `model_not_supported`: selected model is not supported by the current provider path.
- `model_gated`: model terms are not accepted or access is restricted.
- `quota_or_billing`: credits, rate limit, billing, or quota blocked the request.
- `provider_unreachable`: network/provider reachability failure.
- `endpoint_misconfigured`: provider route/path is wrong.
- `unknown_provider_error`: Hugging Face router/API returned an unclassified provider failure.

No OpenAI or Anthropic provider is used for image generation.

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
