# Mockup Automation Workflow v1

Status: owner production workflow now uses real Printify product mockup images. Internal Sharp mockups remain available as a development/proof utility, but they are no longer presented as the owner-facing product mockup path.

## What Is Real

- Browser path: `/studio/mockups`.
- Printify upload path: `POST /api/studio/integrations/printify/uploads`.
- Printify product create path: `POST /api/studio/integrations/printify/products/create`.
- Printify mockup import path: `POST /api/studio/integrations/printify/mockups/import`.
- Provider source: Printify product `images` returned after product creation/fetch.
- Persistence: `printify_product_refs`, generated asset metadata for `printify_upload_id`, and `mockup_assets` rows with `provider_source=printify`.

The owner workflow does not show internal Light Tee, Dark Tee, Sand Tee, Tote, Mug, Sticker Sheet, or Square Product Card templates as production mockups. Real production mockups require a Printify product shell, print provider, selected variants, uploaded `print_png`, and a created Printify draft product.

## Owner Workflow

The `/studio/mockups` page moves through these states:

- Select approved artwork.
- Confirm the `print_png` derivative exists.
- Choose a real Printify product shell in `/studio/printify-catalog`.
- Choose a real Printify print provider and variants.
- Upload the print-ready file to Printify.
- Create a Printify draft product.
- Import Printify product images.
- Select/approve a hero Printify mockup.

If no Printify product exists, the owner-facing blocked state says: “Create a Printify product to generate real mockups.” The primary action is “Open Printify Catalog.”

## Persisted Proof

The Printify mockup workflow stores:

- source asset ID
- derivative kind: `print_png`
- Printify upload ID on generated asset metadata
- Printify product ID/shop/blueprint/provider/variant IDs in `printify_product_refs`
- Printify product image URLs in `mockup_assets`
- `template_id=tmpl_printify_provider_mockup`
- `storage_bucket=printify-provider-url`
- `provider_source=printify`
- hero/default metadata for the selected provider image

Provider image URLs are displayed as Printify-sourced mockups. Raw provider tokens, storage paths, service-role keys, and raw JSON are not shown.

## Internal Renderer Status

Pixel-level regression proof now verifies that a synthetic magenta source artwork changes the rendered mockup output, that the output checksum differs from the base template, and that source-art pixels are detectable inside the expected art zone.

Latest live smoke proof on 2026-07-04:

- source asset: `asset_hf_1783179053612_0_e32d8034`
- mockup: `mockup_1783179063831_tmpl_internal_apparel_light_tee_73d3f8`
- renderer: `internal-sharp-v1`
- preview: `/api/studio/mockups/mockup_1783179063831_tmpl_internal_apparel_light_tee_73d3f8/preview`
- pixel proof: passed with 2,000 sampled pixels, source-like ratio `1`, changed ratio `0.915`

That internal proof remains useful for renderer tests and local diagnostics. It is not the owner production workflow.

## Blocked States

The owner mockup workflow blocks with safe messages when:

- asset is missing
- `print_png` derivative is missing
- Printify is not connected
- Printify product shell is missing
- print provider is missing
- variants are missing
- Printify upload has not completed
- Printify product has not been created
- Printify has not returned mockup images yet
- the provider is rate-limited

No token or service-role value is returned.

## Printify Live Smoke

Guarded live smoke command:

```txt
RUN_LIVE_PRINTIFY_MOCKUP_SMOKE=true PRINTIFY_SMOKE_CONFIRMATION="CREATE TEST PRINTIFY PRODUCT" corepack pnpm smoke:printify-mockups-live
```

The smoke requires a prepared product draft with an approved generated asset, `print_png` derivative, Printify blueprint, provider, and variants. It creates a test Printify draft product and imports product images only when explicitly confirmed. It prints safe IDs and counts only. It was added but not run in this session.

## Tests

Run:

```txt
corepack pnpm test -- tests/pod-golden-path-execution.test.ts
```

The focused tests assert the owner workflow hides internal templates, requires Printify provider mockups for product drafts, uploads the `print_png` derivative, creates Printify products with `print_areas`, imports `product.images`, handles `mockups_not_ready` and `rate_limited`, and keeps internal renderer proof as dev/test-only coverage.

Focused browser runner:

```txt
corepack pnpm frontend:qa:image-mockup
```

Latest local result on 2026-07-04 before this Printify pivot: passing for the image-generation proof path. The updated mockup owner page now shows the Printify blocked/product workflow instead of internal templates.
