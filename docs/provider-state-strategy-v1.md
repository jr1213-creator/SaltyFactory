# Provider State Strategy v1

SaltyFactory uses internal product drafts as the source of truth.

| Internal record | Provider mapping |
|---|---|
| `product_drafts.id` | Shared internal product workflow key |
| `printify_product_refs.product_draft_id` | Maps a Printify draft product to the internal draft |
| `shopify_product_refs.product_draft_id` | Maps a Shopify draft product to the internal draft |
| `shared.source_records` | Tracks provider API source evidence without storing tokens |
| `shared.events` and audit events | Owner-facing and audit-safe provider action history |

Printify success does not mark Shopify complete. Shopify success does not mark Printify complete. The UI shows partial provider state in `/studio/products`, `/studio/shopify-products`, `/studio/publish-review`, and `/studio/launch-packet`.

After Printify draft creation, SaltyFactory performs bounded product retrieval through `PrintifyProviderLive.getProduct`. Real provider-returned mockup/image URLs are persisted on `printify_product_refs.mockup_urls` and may be used as Shopify draft media. If Printify has not generated media during the route-level retry window, the ref remains `draft_created_mockups_pending`; a background retry job is still future.

SaltyFactory does not rely on Printify auto-publishing to Shopify as the primary path because that can bypass internal owner approval gates.
