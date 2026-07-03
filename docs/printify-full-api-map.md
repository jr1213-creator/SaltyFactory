# Printify Full API Map

## Implemented

| Capability | Route or adapter | UI caller | Current behavior |
|---|---|---|---|
| Shop discovery | `GET /api/studio/integrations/printify/shops` | `/studio/printify-catalog` | Calls Printify shops API with server-side token and returns sanitized shop records. Does not require `PRINTIFY_SHOP_ID`. |
| Shop selection evidence | `POST /api/studio/integrations/printify/shops/select` | `/studio/printify-catalog` | Persists selected shop metadata and instructs owner to set `PRINTIFY_SHOP_ID` server-side. Does not store raw token. |
| Blueprint catalog | `GET /api/studio/integrations/printify/catalog/blueprints` | `/studio/printify-catalog` | Calls real Printify catalog when `PRINTIFY_ENABLED`, token, and shop ID are configured. |
| Print providers | `GET /api/studio/integrations/printify/catalog/blueprints/:id/providers` | `/studio/printify-catalog` | Loads real providers for selected blueprint. |
| Variants | `GET /api/studio/integrations/printify/catalog/blueprints/:id/providers/:providerId/variants` | `/studio/printify-catalog` | Loads real variants and exposes them to the variant matrix. |
| Shipping snapshot | `GET /api/studio/integrations/printify/catalog/blueprints/:id/providers/:providerId/shipping` | `/studio/printify-catalog` | Loads provider shipping data when available. |
| Variant selection persistence | `POST /api/studio/integrations/printify/catalog/selection` | `/studio/printify-catalog` | Persists selected blueprint/provider/variant IDs and owner-entered pricing to `product_variants`. |
| Image upload | `POST /api/studio/integrations/printify/uploads`, `PrintifyProviderLive.uploadImage` | `/studio/printify-catalog`, `/studio/publish-review` | Uploads approved generated artwork to Printify `/v1/uploads/images.json` and persists returned upload ID. |
| Product creation | `POST /api/studio/publish/printify`, `PrintifyProviderLive.createProduct` | `/studio/publish-review` | Creates a Printify draft product from approved generated artwork, upload ID, selected variants, print areas, pricing, listing copy, gates, and owner permission. |
| Product retrieval | `PrintifyProviderLive.getProduct` | adapter/tested; route-level retrieval future | Retrieves real Printify product by ID. |

## Blocked By Config

Printify draft creation requires:

```txt
PRINTIFY_ENABLED=true
PRINTIFY_API_TOKEN=
PRINTIFY_SHOP_ID=
```

Product creation also requires approved generated artwork, passed asset QA, selected blueprint, selected print provider, selected variants, pricing, a computed publish review, passing publish gates, and owner provider permission.

## Not Implemented Yet

- Printify order/fulfillment lifecycle UI.
- Automatic Printify to Shopify publish bridge. SaltyFactory intentionally uses its own internal mapping instead.
- Provider-generated mockup retrieval as the primary mockup source.
