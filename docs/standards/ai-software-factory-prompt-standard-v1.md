# SaltyFactory AI Software Factory Prompt Standard v1

## Purpose

This standard defines how AI coding agents should be prompted to build, review, and verify SaltyFactory changes. It exists to prevent AI slop: broad scaffolds, fake completion, orphaned routes, provider theater, untested workflows, and docs that describe intended behavior instead of verified behavior.

Use this standard for Codex implementation prompts, Claude code reviews, Gemini UX reviews, ChatGPT planning, and any other AI-assisted software work in this repo.

## Core Rule

A feature is not complete unless the full vertical path is real and verified:

1. A real user can trigger it through the Studio or storefront UI.
2. The UI calls a real backend route or is visibly blocked with a specific reason and setup action.
3. The route performs real internal/provider work or returns an honest setup/owner-gate blocker.
4. Data persists through the repository/database layer when persistence is part of the feature.
5. The next pipeline stage can read what was written.
6. At least one success-path test asserts a real side effect.
7. Failure states are specific, safe, and actionable.
8. Secrets do not leak.
9. Docs match verified reality.
10. The final report states remaining blockers and future work honestly.

## Prompt Template

Use this shape for implementation prompts:

```md
You are working in SaltyFactory.

Repo:
<path>

Branch:
<branch>

Latest known commit:
<hash/message, if relevant>

Role:
You are a principal/staff-level <frontend/backend/full-stack/security/provider> engineer.

Task:
<one concrete outcome>

Goal:
<business/user workflow outcome>

Non-goals:
- <what not to expand>
- <what must remain future/config-blocked/owner-gated>

Guardrails:
- no fake completion
- no orphaned routes
- no fake provider success
- no secret leakage
- no AI self-authority
- no auth bypass
- tests required
- docs must match reality

Inspect first:
- <files/routes/packages/tests/docs>

Implementation requirements:
1. <vertical slice>
2. <UI behavior>
3. <API/backend behavior>
4. <persistence/downstream read>
5. <security/authorization>
6. <provider honesty>
7. <docs>

Tests required:
- <success path>
- <blocked path>
- <security/no-secret path>

Validation:
- corepack pnpm lint
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm build
- corepack pnpm check:guardrails
- corepack pnpm check:secrets
- corepack pnpm check:production

Commit:
<truthful commit message>

Final report:
1. Summary
2. Files/routes changed
3. Tests added
4. Validation results
5. Remaining blockers
6. Commit hash
```

## Required Phrasing

Prompts must include direct operational language when applicable:

- Inspect before editing.
- Do not assume prior implementation reports are true.
- Build the real user-triggered flow.
- Do not create orphaned backend routes.
- Do not leave UI buttons disconnected from backend routes.
- Do not fake provider success, IDs, costs, images, publishing, sending, spending, banking, analytics, or ordering.
- If a provider is missing, block with exact setup requirements and a user-facing setup path.
- Do not expose secrets, tokens, EIN, bank data, or service-role credentials.
- Do not weaken auth or owner gates.
- Add tests that prove persisted side effects and blocked-path safety.
- Update docs to reflect verified reality only.
- Report what remains manual, config-blocked, owner-gated, future, or not implemented.

## Forbidden Completion Claims

Do not use these claims unless the Definition of Done is actually met for the named scope:

- complete
- fully implemented
- production ready
- go-live ready
- provider-backed
- end-to-end
- enterprise-grade
- secure
- functional

Allowed replacement language:

- functional for `<specific verified path>`
- config-blocked until `<specific config>`
- owner-gated by `<specific gate>`
- manual/export-ready
- partial foundation
- future integration
- not implemented

## Feature Labels

Every feature status in docs, final reports, and readiness UI must use one of:

- `functional`: UI -> API -> persistence/provider -> downstream read is verified.
- `config-blocked`: implementation exists but requires exact configuration.
- `owner-gated`: action requires explicit owner approval/confirmation.
- `manual/export-ready`: internal draft/export path works; live external execution does not.
- `partial`: some paths work, but a required vertical slice is missing.
- `future`: intentionally not implemented in v1.
- `not implemented`: no real usable path exists.

## AI-Agent Authority

AI employees and AI coding agents may:

- suggest
- draft
- classify
- summarize
- recommend
- create owner-reviewable requests
- create internal tasks when explicitly allowed

AI employees and AI coding agents may not autonomously:

- publish
- sync
- spend
- send
- delete production data
- connect bank accounts
- access or use EIN
- access full bank details
- expose secrets
- modify provider credentials
- create live ads
- post to social
- place orders
- submit external forms/applications
- grant themselves permissions
- create new active AI employees without owner approval
- bypass owner gates

## Provider Integrity

Provider work must satisfy:

- server-side provider clients only
- explicit feature flag plus required config
- workspace authorization
- sanitized errors
- no token in frontend bundle or API response
- no fake provider IDs
- no fake success
- no fake costs, mockups, analytics, images, orders, publishing, sending, spending, or banking
- setupRequired/blockingReasons returned when config is missing
- UI caller exists for provider routes that are part of the product
- tests cover success with realistic mocked provider output and config-blocked failure

## Frontend Quality

User-facing UI must:

- use existing design-system components where practical
- avoid giant one-off page files when shared components fit
- avoid raw config dumps in owner-facing views
- avoid smashed text and concatenated values
- avoid dead disabled states
- provide useful empty states with next actions
- show setup blockers in plain English
- hide env names except in Advanced / Developer details
- include labels for forms
- include meaningful button text
- explain disabled buttons
- preserve keyboard/focus accessibility
- avoid fake metrics and fake counts
- keep provider statuses business-facing and honest

## No Dead Config States

Any setup blocker must include:

- status
- business-facing explanation
- why it matters
- primary setup action
- setup guide
- validation action when applicable
- request-help action
- advanced details toggle
- safe error message
- no secret values

Bad:

```txt
PRINTIFY_API_TOKEN missing
```

Good:

```txt
Printify is not connected yet.
Connect Printify so SaltyFactory can browse catalog products, upload approved artwork, and create draft products.
Action: Connect Printify
Guide: Where do I get this?
Validation: Validate token
Help: Request setup help
```

## Final Report Format

Every implementation session must return:

1. Summary
2. Docs created/updated
3. UI routes changed
4. API routes changed
5. Data persistence changed
6. Security/authority behavior
7. Tests added/updated
8. Validation results
9. Remaining config blockers
10. Remaining future integrations
11. Known unverified gaps
12. Commit hash

Reports must be short, factual, and explicit about failures. Do not bury blockers after optimistic summaries.
