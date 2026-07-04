# Launch Setup Concierge v1

Status: functional owner-facing setup foundation.

The Launch Setup Concierge replaces the old customer-facing “edit env files” mindset. Business owners use Studio setup flows; env files remain only for local development, CI, and server deployment.

## Routes

- `/studio/onboarding`
- `/studio/onboarding/quick-start`
- `/studio/onboarding/guided`
- `/studio/onboarding/providers`
- `/studio/onboarding/providers/printify`
- `/studio/onboarding/providers/shopify`
- `/studio/onboarding/providers/image-generation`
- `/studio/onboarding/business-profile`
- `/studio/onboarding/first-launch`
- `/studio/onboarding/help`
- `/studio/setup` remains available, with owner setup first and Advanced Server Configuration collapsed behind details.

## No Dead Config States

Every setup blocker must include:

- plain-English explanation
- why it matters
- primary setup action
- “Where do I get this?” guide
- validation action when a provider can be validated
- request-help action
- Advanced / Developer details toggle
- safe error message
- no secret values

Bad: `PRINTIFY_API_TOKEN missing`

Good: “Printify is not connected yet.” Action: “Connect Printify.” Guide: “Where do I get this?”

## Modes

Self-guided setup:
- Owner reads provider instructions and enters values in secure fields.
- Secrets are write-only.
- Server validates provider access.

Quick setup:
- Technical owner uses provider cards and validation forms on `/studio/onboarding/quick-start`.
- Still does not expose tokens or enable dangerous actions.

Guided setup:
- `/studio/onboarding/guided` walks through business profile, image generation, Printify, Shopify, first batch, launch packet, and publish review.

Concierge setup:
- `/studio/onboarding/help` persists setup assistance requests.
- Help requests warn users not to paste tokens, passwords, EIN, routing numbers, or bank account data.

## Safety

Live publish remains owner-gated.
Money movement remains blocked.
External order submission remains future/disabled.
AI employees cannot self-grant authority, connect providers, spend, send, sync, publish, or access secrets.

## Validation

Provider validation runs server-side only:

- Printify token validation calls Printify shops discovery.
- Shopify Dev Dashboard validation exchanges Client ID/Secret server-side, calls the Shopify Admin shop endpoint, and discovers collections.
- Legacy Shopify Admin token validation remains available under Advanced / Legacy only.
- Image generation validation uses the Hugging Face Inference Providers router for the real provider path, checks token/model access server-side, and labels local demo mode as development/test-only.

Validation responses return only safe status, setup requirements, next step, masked display, and sanitized metadata.

## Image Generation Setup

The image generation onboarding page must show two separate paths:

- `Use local demo mode`: fastest local development/test preview. It does not count as provider success and is blocked in production.
- `Hugging Face provider`: real provider validation. The token must be a fine-grained Hugging Face token with `Make calls to Inference Providers`.

Recommended HF Inference text-to-image models:

- `black-forest-labs/FLUX.1-schnell`
- `stabilityai/stable-diffusion-3-medium-diffusers`

The old `stabilityai/stable-diffusion-xl-base-1.0` default is not treated as supported for the current `hf-inference` router path. The UI includes a `Try a recommended model` action.

Image provider validation never returns raw transport strings such as `fetch failed`. It maps provider failures to:

- `token_missing`
- `token_invalid`
- `permission_missing`
- `model_not_found`
- `model_not_supported`
- `model_gated`
- `quota_or_billing`
- `provider_unreachable`
- `endpoint_misconfigured`
- `unknown_provider_error`

No token is returned to the browser or written into owner-facing error messages. No OpenAI or Anthropic provider is used.
