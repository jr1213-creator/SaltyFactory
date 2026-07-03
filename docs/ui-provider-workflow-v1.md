# UI Provider Workflow v1

## Primary Routes

| Route | Purpose |
|---|---|
| `/studio/pod-launch-studio` | Provider health, pipeline board, batch progress, blockers, and launch packet entry. |
| `/studio/image-generation` | Generation queue view for worker-backed image jobs and persisted assets. |
| `/studio/printify-catalog` | Printify shop discovery, shop selection, blueprint/provider/variant/shipping discovery, variant persistence, and artwork upload. |
| `/studio/publish-review` | Provider actions for guarded Printify draft and Shopify draft creation. |
| `/studio/shopify-products` | Shopify draft refs, admin links, media upload action, and public visibility status. |
| `/studio/products` | Internal product-to-provider mapping view. |
| `/studio/launch-packet` | Review/export artifact summarizing launch state and blockers. |
| `/studio/pod-batches` | 15-product batch workflow and item progress. |

## UI Caller Contract

- "Send to Printify" calls `POST /api/studio/publish/printify`.
- "Create Shopify Draft" calls `POST /api/studio/publish/shopify`.
- Printify Catalog calls shop, catalog, provider, variant, shipping, selection, and upload routes.
- Shopify Products calls `POST /api/studio/integrations/shopify/media`.
- Batch pages call batch create/detail/retry routes.

Disabled buttons and API responses surface exact blockers such as missing provider env, missing artwork, missing variants, missing pricing, or failed gates.
