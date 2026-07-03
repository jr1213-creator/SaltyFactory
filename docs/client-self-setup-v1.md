# Client Self-Setup v1

Status: implemented owner-facing setup foundation.

Customers should not edit `.env.local`, deployment variables, text files, or developer settings to use SaltyFactory. Those files still exist for developers, CI, local tests, and server deployment.

## Customer Setup Paths

Customers use:

- Guided Setup: `/studio/onboarding/guided`
- Quick Setup: `/studio/onboarding/quick-start`
- Provider setup pages: `/studio/onboarding/providers/*`
- Setup Concierge help: `/studio/onboarding/help`
- Setup overview: `/studio/setup`

## What Customers See

Customers see:

- “Connect Printify”
- “Connect Shopify”
- “Configure image generation”
- “Choose your Printify shop”
- “Validate connection”
- “Save securely”
- “Ready”
- “Needs attention”

Customers should not primarily see raw env-first messages such as `PRINTIFY_API_TOKEN missing`.

## What Developers Still Configure

Developer/server env configuration remains for:

- local development
- CI/test configuration
- server deployment
- server-only storage credentials
- credential encryption key
- optional provider defaults

Env var names may appear only in Advanced / Developer details, setup docs, or deployment docs.

## Security Expectations

- Secret fields are write-only.
- Saved credentials show only connected/invalid/masked status.
- Server validates providers.
- Shopify Client ID/Secret token exchange runs server-side only; the Client Secret and generated Admin access token are never shown after save.
- Provider calls never originate from the browser.
- Tokens, EIN, bank account data, service-role keys, and provider secrets are never returned.
- Setup help requests reject secret-like content.

## Feature Blocks

Every blocker has a next action. If the owner cannot complete setup safely, the UI must say “This requires administrator setup” and provide a help request path.
