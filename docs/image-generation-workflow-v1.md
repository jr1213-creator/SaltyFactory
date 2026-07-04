# Image Generation Workflow v1

Status: API/route-tested, browser-proven locally, and live-smoke proven for approved brief to private generated asset package. The latest live smoke used the guided Hugging Face credential-store provider and stored real provider output in private Supabase-backed storage.

## What Is Real

- Browser path: `/studio/image-generation` and `/studio/briefs`.
- API path: `POST /api/studio/design-briefs/[id]/send-to-generation`.
- Provider path: server-side Hugging Face resolver through guided provider credentials first, development local demo only when explicitly enabled.
- Persistence: `generation_jobs` and `design_assets`.
- Preview: `GET /api/studio/assets/[assetId]/preview`.
- Derivative previews: `GET /api/studio/assets/[assetId]/derivatives/[kind]/preview`.

Approved briefs can generate up to four artwork variants from the browser. Each variant persists:

- generated master asset
- seed
- model
- prompt and negative prompt in private metadata
- style preset
- print target
- checksum
- MIME type
- dimensions
- private storage bucket/path server-side only

The browser response returns safe IDs, preview routes, model, dimensions, and derivative proof. It does not return Hugging Face tokens, service-role keys, private bucket paths, or raw provider responses.

## Prompt Recipe

The route builds a POD prompt recipe from the approved brief. Supported style presets:

- Coastal Cowgirl
- Western Luxe
- Retro Rodeo
- Surf Ranch
- Minimal Boutique
- Sticker Pack
- Kids Tee
- Holiday Drop
- Monoline
- Vintage Distressed

Default negative prompt includes low-resolution, distorted text, watermark, product photo, human model, and cluttered background blockers. If text is requested, the workflow records an owner spelling-review warning.

## Derivative Package

Every generated master creates private derivative rows in `design_assets`:

- `thumbnail`
- `web_preview`
- `print_png`

The print PNG is the downstream mockup source. If the model output has no alpha channel, SaltyFactory records it as a plain-background print file rather than claiming it is transparent. Generated opaque print files pass QA with a plain-background warning so internal mockups can render real output without pretending transparency exists.

## Worker Path

The worker path persists one generated master and derivative package before marking a job completed. It does not yet support `requestedVariantCount` the same way the browser route does.

Status: `PARTIAL`.

Required follow-up: teach the worker to iterate requested variants, persist per-variant seeds/assets/derivatives, and only mark complete after at least one variant asset exists. The browser route already has multi-variant proof.

## Blocked States

Generation is blocked when:

- the brief is not approved
- prompt safety blockers are present
- Hugging Face is not connected
- private storage is not ready
- all variants fail
- provider returns a non-image or unsafe error

Provider errors are mapped to owner-safe statuses by `@saltyfactory/ai-free`.

## Tests

Run:

```txt
corepack pnpm test -- tests/pod-golden-path-execution.test.ts
```

The focused tests assert multi-variant local generation, seed metadata, derivative rows, protected preview bytes, no token leakage, and generated artwork page rendering.

## Live Smoke

Skipped by default:

```txt
corepack pnpm smoke:image-mockup-live
```

To run with configured local credentials:

```txt
RUN_LIVE_IMAGE_MOCKUP_SMOKE=true corepack pnpm smoke:image-mockup-live
```

The script creates one approved brief, generates one variant, runs QA, approves the asset, renders internal mockups, verifies previews, and prints IDs only.

Latest local result on 2026-07-04: passing through the guided credential-store provider after the owner manually accepted Hugging Face access for `black-forest-labs/FLUX.1-schnell`. The smoke created approved brief `brief_1783179051850`, generated Hugging Face-backed asset `asset_hf_1783179053612_0_e32d8034`, created derivative kinds `thumbnail`, `web_preview`, and `print_png`, verified protected preview routes, rendered internal mockup `mockup_1783179063831_tmpl_internal_apparel_light_tee_73d3f8`, and wrote report `.saltyfactory-private/smoke-reports/image-mockup-1783179066858.json`.

The standalone HF-only env-token probe on 2026-07-04 did not pass: local env exposes `HF_API_TOKEN`, but Hugging Face returned `401 Invalid username or password`. That does not invalidate the app runtime proof because the passing Studio smoke used the saved credential-store token, not the stale env fallback token.

Safe proof routes from the passing run:

- `/api/studio/assets/asset_hf_1783179053612_0_e32d8034/preview`
- `/api/studio/assets/asset_hf_1783179053612_0_e32d8034/derivatives/thumbnail/preview`
- `/api/studio/assets/asset_hf_1783179053612_0_e32d8034/derivatives/web_preview/preview`
- `/api/studio/assets/asset_hf_1783179053612_0_e32d8034/derivatives/print_png/preview`

## Browser Proof

Focused runner:

```txt
corepack pnpm frontend:qa:image-mockup
```

This starts Studio with `APP_ENV=test`, `REPOSITORY_ADAPTER=memory`, `PLAYWRIGHT_AUTH_BYPASS=true`, and local demo image generation. Latest local result on 2026-07-04: passing. The browser proof creates and approves a brief, generates four local proof variants, verifies protected asset and derivative previews, runs QA against the print PNG package, approves the asset, renders recommended internal mockups, verifies the protected mockup preview, and sets a hero mockup.
