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
10. Upload approved generated artwork to Printify only after a product draft and approved artwork exist. The API response returns the Printify upload ID and a safe asset summary only; it does not return storage bucket/path internals or provider tokens.
11. Product creation remains gated by Publish Review and owner permission.
12. After guarded product creation succeeds, `/studio/publish-review` shows the persisted Printify upload ID, Printify draft product ID, sync status, and the real next blocker.

## Rules

- No fake blueprint, provider, variant, upload, product, or mockup IDs.
- No product draft is required to browse the catalog.
- A product draft is required to save variants and upload artwork.
- Printify product creation remains draft-only and owner-gated.
- Live publish is separate and disabled/gated by default.
- Provider failures must be sanitized and actionable.

## Verified Golden Path

The catalog stage expects a product draft created from:

- generated private asset
- passing QA and owner asset approval
- composed private mockup
- owner-approved mockup

After variant selection, `/studio/publish-review` should move the next blocker from catalog selection to the actual remaining gate, such as risk review, owner approval, Shopify collection, or provider draft creation.

After provider draft creation, `/studio/publish-review` should stop treating Printify as merely connected. It should show concrete provider proof:

- Printify image uploaded: the persisted upload ID.
- Printify product created: the persisted Printify draft product ID.
- Printify remains draft-only; live publishing remains separate and gated.
