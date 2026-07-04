# Mockup Automation Workflow v1

Status: API/route-tested, browser-proven locally, and live-smoke proven for internal automated mockups from approved generated assets. The latest live smoke rendered a Sharp internal mockup from a real Hugging Face-generated `print_png` derivative.

## What Is Real

- Browser path: `/studio/mockups`.
- API path: `POST /api/studio/mockups/generate`.
- Preview path: `GET /api/studio/mockups/[mockupId]/preview`.
- Hero selection path: `POST /api/studio/mockups/[mockupId]/hero`.
- Renderer: internal Sharp compositor.
- Persistence: `mockup_templates` and `mockup_assets`.

Internal mockups are rendered only from an approved asset with passing QA and an existing `print_png` derivative. The renderer does not use placeholder success when source art or the print derivative is missing.

## Internal Template Pack

Current internal preview templates:

- Apparel Front - Light Tee
- Apparel Front - Dark Tee
- Apparel Front - Sand Tee
- Tote Front - Natural Canvas
- Sticker Sheet - Cream Background
- Mug Front - White Mug
- Square Product Card - Boutique Flatlay

These are labeled `internal_preview`. They are real composited internal mockups, not Printify provider-generated mockups.

## Renderer Proof

Each mockup render stores:

- source asset ID
- print derivative asset ID
- template ID
- placement JSON
- renderer version: `internal-sharp-v1`
- checksum
- private storage path server-side only
- preview route
- hero flag metadata

The owner UI shows the selected asset, template controls, placement controls, rendered mockup preview, and hero selection.

Pixel-level regression proof now verifies that a synthetic magenta source artwork changes the rendered mockup output, that the output checksum differs from the base template, and that source-art pixels are detectable inside the expected art zone.

Latest live smoke proof on 2026-07-04:

- source asset: `asset_hf_1783179053612_0_e32d8034`
- mockup: `mockup_1783179063831_tmpl_internal_apparel_light_tee_73d3f8`
- renderer: `internal-sharp-v1`
- preview: `/api/studio/mockups/mockup_1783179063831_tmpl_internal_apparel_light_tee_73d3f8/preview`
- pixel proof: passed with 2,000 sampled pixels, source-like ratio `1`, changed ratio `0.915`

## Blocked States

Mockup rendering blocks with safe messages when:

- asset is missing
- asset QA has not passed
- asset is not approved for mockups
- `print_png` derivative is missing
- template is missing
- renderer/storage write fails

No token or service-role value is returned.

## Printify Mockups

Printify product mockup import is not part of this pass. Provider-generated mockups remain separate and require a persisted Printify product reference before they can be imported.

## Tests

Run:

```txt
corepack pnpm test -- tests/pod-golden-path-execution.test.ts
```

The focused tests assert missing derivative blocking, source-art pixel composition, different checksum after placement change, persisted mockup records, protected preview bytes, recommended multi-renders, and hero selection.

Focused browser runner:

```txt
corepack pnpm frontend:qa:image-mockup
```

Latest local result on 2026-07-04: passing. The browser runner authenticates through a guarded test bypass, loads the approved generated asset, renders recommended internal mockups through the real backend route, verifies a protected rendered preview, and persists hero selection.
