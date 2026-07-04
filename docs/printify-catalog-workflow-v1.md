# Printify Catalog Workflow v1

Printify catalog browsing is part of the POD golden path, not a setup screen.

## Runtime Source

The normal runtime path is the secure workspace provider connection created through `/studio/onboarding/providers/printify`.

Resolution order:

1. Connected Printify provider credential record with selected shop.
2. Advanced server env fallback only when no connected provider record exists.
3. `setup_required` with a link back to Printify onboarding.

The Printify token is never returned to the browser, logs, or owner-facing errors.

## Owner Flow

1. Open `/studio/printify-catalog`.
2. If Printify is connected, catalog browsing is available even before a product draft exists.
3. Load or refresh real blueprints from Printify.
4. Select a blueprint.
5. Load real print providers for the selected blueprint.
6. Select a provider.
7. Load real variants and optional shipping snapshot.
8. After a product draft exists, select variants and enter owner-reviewed pricing.
9. Save the selection. The route persists product variants, draft metadata, and price-margin evidence.
10. Upload the `print_png` derivative to Printify only after a product draft and approved artwork exist. The API response returns the Printify upload ID and a safe asset summary only; it does not return storage bucket/path internals or provider tokens.
11. Create a Printify draft product with the selected blueprint, print provider, variants, and `print_areas` referencing the real Printify upload ID.
12. Fetch/import Printify product images and persist them as provider mockup rows.
13. Select the hero Printify mockup in `/studio/mockups`.
14. Product creation and live publish remain separate from Shopify and remain owner-gated.

## Rules

- No fake blueprint, provider, variant, upload, product, or mockup IDs.
- No product draft is required to browse the catalog.
- A product draft is required to save variants and upload artwork.
- Printify product creation for mockups is explicit and confirmation-driven; live publishing remains disabled/gated by default.
- Live publish is separate and disabled/gated by default.
- Provider failures must be sanitized and actionable.
- Internal preview templates are not production mockups.

## Verified Golden Path

The catalog stage expects:

- generated private asset
- passing QA and owner asset approval
- `print_png` derivative
- saved Printify blueprint/provider/variant selection
- owner-reviewed pricing

After variant selection, `/studio/publish-review` should move the next blocker from catalog selection to the actual remaining gate, such as risk review, owner approval, Shopify collection, or provider draft creation.

After Printify draft product creation/import, `/studio/mockups` and `/studio/publish-review` should stop treating Printify as merely connected. They should show concrete provider proof:

- Printify image uploaded: the persisted upload ID.
- Printify product created: the persisted Printify draft product ID.
- Printify mockups imported: persisted product image rows sourced from Printify.
- Printify remains draft-only; live publishing remains separate and gated.

## Live Smoke

The guarded live smoke command is:

```txt
RUN_LIVE_PRINTIFY_MOCKUP_SMOKE=true PRINTIFY_SMOKE_CONFIRMATION="CREATE TEST PRINTIFY PRODUCT" corepack pnpm smoke:printify-mockups-live
```

Latest live result on 2026-07-04: passed with guided credential-store credentials. The smoke uploaded `print_png`, received Printify upload ID `6a495803f2b0395d7831a573`, created test Printify product `6a495f94ea82e6b84903c9e6`, imported `3` product images, and persisted Printify mockup rows. The test product title used the `SALTYFACTORY SMOKE TEST - DELETE ME` prefix. Shopify publish and live sync were not called.

The smoke is skipped unless both live flags are set. It may create a disposable smoke draft from approved generated artwork if no prepared product draft exists.
