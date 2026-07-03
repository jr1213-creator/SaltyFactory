# Shopify Full API Map

## Implemented

| Capability | Route or adapter | UI caller | Current behavior |
|---|---|---|---|
| Admin health | `ShopifyAdminProviderLive.testConnection/fetchShopInfo` | Integrations/Account Center paths | Calls `shop.json` when configured and returns sanitized result. |
| Draft product creation | `POST /api/studio/publish/shopify`, `ShopifyAdminProviderLive.createProductDraft` | `/studio/publish-review` | Creates Shopify products with `status: draft` only after publish review gates pass, approved mockup media exists, pricing/variants exist, and a real Shopify collection ID is supplied. No live publish. |
| Media/image upload | `POST /api/studio/integrations/shopify/media`, `ShopifyAdminProviderLive.uploadProductImage` | `/studio/shopify-products` | Uploads approved mockup media to an existing Shopify draft product. Requires signed/public media URL. |
| Product update | `ShopifyAdminProviderLive.updateProduct` | adapter/tested; route-level edit future | Updates Shopify product payload safely as draft by default. |
| Collection assignment | `ShopifyAdminProviderLive.assignCollection` | `/studio/publish-review` required collection ID | Creates a Shopify collect for the provided Shopify collection ID. A display collection name is not treated as a verified collection assignment. |
| Product retrieval | `ShopifyAdminProviderLive.getProduct` | adapter/tested; route-level retrieval future | Retrieves real Shopify product by ID. |
| Provider refs | `shopify_product_refs` | `/studio/shopify-products`, `/studio/products`, `/studio/launch-packet` | Stores Shopify product ID, GID, handle, admin URL, media, SEO, sync status, and source record. |

## Draft Product Payload

Shopify draft creation includes:

- title
- description/body HTML
- vendor
- product type
- tags
- SEO title and description
- variants/options/pricing
- approved mockup media URLs
- required Shopify collection ID for assignment

## Blocked By Config

Shopify draft creation requires:

```txt
SHOPIFY_ADMIN_ENABLED=true
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_TOKEN=
```

It also requires persisted product draft, publish review, passing gates, product variants/pricing, approved mockup media, a real Shopify collection ID, and owner provider permission.

## Publish Rule

Draft creation does not publish to saltycowhide.com. Storefront publish remains blocked unless live publishing is explicitly enabled, gates pass, and the owner confirms the publish action.
