# Image Generation Workflow v1

Status: API/route-tested and browser-proven locally for approved brief to private generated asset package using the guarded local proof provider. Live Hugging Face smoke is still not proven because the live smoke blocks at local Drizzle smoke brief insertion before provider execution.

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

The print PNG is the downstream mockup source. If the model output has no alpha channel, SaltyFactory records it as a plain-background print file rather than claiming it is transparent.

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

Latest local result on 2026-07-04: live smoke did not pass. It blocked on local Drizzle persistence while inserting the smoke brief, before any Hugging Face provider call. No provider token or storage secret was printed. Treat live Hugging Face proof as not complete until this script prints an `ok: true` report.

## Browser Proof

Focused runner:

```txt
corepack pnpm frontend:qa:image-mockup
```

This starts Studio with `APP_ENV=test`, `REPOSITORY_ADAPTER=memory`, `PLAYWRIGHT_AUTH_BYPASS=true`, and local demo image generation. Latest local result on 2026-07-04: passing. The browser proof creates and approves a brief, generates four local proof variants, verifies protected asset and derivative previews, runs QA against the print PNG package, approves the asset, renders recommended internal mockups, verifies the protected mockup preview, and sets a hero mockup.
