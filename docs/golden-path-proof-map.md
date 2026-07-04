# POD Golden Path Proof Map

This map is the implementation proof surface for the private-beta POD path. It tracks browser-visible steps, backend actions, provider calls, persisted evidence, and tests. A provider being connected is not enough; each step must leave evidence the next step can consume.

| Step | Owner route | Backend/provider route | Persisted proof | Downstream consumer | Regression proof |
|---|---|---|---|---|---|
| Brief approval | `/studio/briefs` | Design brief approval routes | Approved brief row with generation prompt and owner approval state | Send-to-generation route | `tests/pod-golden-path-execution.test.ts` |
| Generate art | `/studio/briefs`, `/studio/image-generation` | `/api/studio/design-briefs/[id]/send-to-generation`, worker | Generation job plus master `design_assets` rows and derivative rows: `thumbnail`, `web_preview`, `print_png` | Asset preview, QA, mockups, product builder | `tests/pod-golden-path-execution.test.ts` |
| Private asset preview | `/studio/assets`, downstream preview cards | `/api/studio/assets/[id]/preview`, `/api/studio/assets/[id]/derivatives/[kind]/preview` | Private storage objects read server-side; no public source art URL or private bucket path in owner response | QA, mockups, product builder, publish review | `tests/pod-golden-path-execution.test.ts` |
| QA approval | `/studio/assets` | Asset QA/approval routes | QA row and asset `qa_status`, `approved_for_mockup`; generated masters must have derivative package proof | Mockup generation and product draft creation | `tests/pod-golden-path-execution.test.ts` |
| Mockup generation | `/studio/mockups` | `/api/studio/mockups/generate` | Mockup row with source asset, print derivative asset, template, placement JSON, renderer version, checksum, private path, approved state | Product builder and Shopify media handoff | `tests/pod-golden-path-execution.test.ts`, `tests/provider-functional-api-mapping.test.ts` |
| Mockup preview | `/studio/mockups`, product/publish pages | `/api/studio/mockups/[id]/preview` | Authenticated byte response from private mockup storage | Product Builder, Publish Review, Shopify draft route | `tests/pod-golden-path-execution.test.ts` |
| Product draft | `/studio/product-builder` | `/api/studio/drafts/create-from-assets` | Product draft with asset ID, mockup IDs, pricing, collection, tags, provider target | Printify catalog selection and Publish Review | `tests/pod-golden-path-execution.test.ts` |
| Printify catalog | `/studio/printify-catalog` | `/api/studio/integrations/printify/catalog/*` | Live blueprint/provider/variant data fetched through resolver; saved variant rows and margin checks | Printify upload/product create | `tests/printify-runtime-resolver.test.ts`, `tests/pod-golden-path-execution.test.ts` |
| Printify image upload | `/studio/printify-catalog`, provider action panel | `/api/studio/integrations/printify/uploads` and `/api/studio/publish/printify` | Asset metadata `printify_upload_id`, source event, no storage path in response | Printify print areas/product creation | `tests/printify-runtime-resolver.test.ts` |
| Printify product creation | `/studio/publish-review` provider action | `/api/studio/publish/printify` | `printify_product_refs` row with product ID, shop ID, blueprint, provider, upload ID, variants, print areas, draft status | Launch packet, Publish Review proof rows, future fulfillment sync | `tests/printify-runtime-resolver.test.ts` |
| Shopify draft creation | `/studio/publish-review` provider action | `/api/studio/publish/shopify` | `shopify_product_refs` row with product ID/GID/handle/admin URL/media/collection IDs/draft status | Shopify Products, Launch Packet, Publish Review proof rows | `tests/pod-golden-path-execution.test.ts` |
| Shopify media | `/studio/publish-review` provider action | Shopify draft create payload | Approved mockup media URL in product payload and persisted ref media array | Shopify admin draft and Launch Packet | `tests/pod-golden-path-execution.test.ts` |
| Shopify collection assignment | `/studio/publish-review` provider action | Shopify collects API via provider adapter | `shopify_collection_ids` on product ref and collection assignment metadata | Publish Review proof and Shopify Products | `tests/pod-golden-path-execution.test.ts` |
| Publish Review truth surface | `/studio/publish-review` | Publish readiness and provider action routes | Server-computed review gates plus provider proof rows for Printify upload/product and Shopify draft/media/collection | Owner decision and launch packet | `tests/pod-golden-path-execution.test.ts` |
| Live publish | `/studio/publish-review` / go-live route | `/api/studio/publish/shopify/[refId]/go-live` | No live publish evidence by default; blocked unless flags, owner role, gates, and exact confirmation pass | Public storefront projection only after explicit allowed path | `tests/shopify-go-live-route.test.ts` |

## Current Browser Contract

The owner-facing path should answer these questions at every stage:

1. What artifact or provider proof exists now?
2. What is the next real action?
3. What persisted evidence will that action create?
4. What safety gate blocks the action?

Provider proof now visible in `/studio/publish-review`:

- Printify image uploaded: upload ID from asset metadata or Printify product ref.
- Printify product created: Printify draft product ID and sync status.
- Shopify draft created: Shopify product ID and draft status.
- Shopify media attached: approved mockup media count.
- Shopify collection assigned: persisted Shopify collection IDs.

## Known Verification Gaps

- Live external provider smoke was not run by automated tests; tests use mocked provider responses or local demo image bytes for deterministic CI.
- Live image/mockup smoke exists as `corepack pnpm smoke:image-mockup-live` and is skipped unless `RUN_LIVE_IMAGE_MOCKUP_SMOKE=true`.
- Shopify currently uses the REST Admin adapter in the repo. GraphQL is a future migration, not required for the current verified draft path.
- Publish Review provider proof rows are derived from persisted refs and asset metadata. The core domain gate schema still uses the legacy compact gate set.
