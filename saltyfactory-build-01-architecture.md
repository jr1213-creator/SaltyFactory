# SaltyFactory — Build 1 Architecture Document
**Salty Cowhide Co. | Headless POD Commerce System + Private AI Product Factory**
Version: 0.1 | Date: 2026-06-29 | Status: Architecture Locked

---

## Purpose

This document defines the locked architecture for SaltyFactory — the private product generation engine and public headless storefront for Salty Cowhide Co. It is the Build 1 equivalent of a CivicFlow foundation checkpoint: decisions locked, schemas defined, routes mapped, guardrails enforced, no live integrations yet.

**Public brand:** Salty Cowhide Co. — coastal western / western luxe print-on-demand  
**Public URL:** saltycowhide.com  
**Private system:** SaltyFactory — the trend-to-product pipeline  
**AI stack:** Cloud/free-tier (Hugging Face Inference API, Transformers.js, free Replicate tier) — no OpenAI, no Anthropic

---

## Section 1: Locked Architecture Decisions

### 1.1 Monorepo Structure
SaltyFactory is a pnpm monorepo. Public storefront and private studio are separate apps sharing typed domain packages.

```
saltyfactory/
  apps/
    storefront/       # saltycowhide.com — public Next.js headless store
    studio/           # /studio — private admin product factory (auth-gated)
    worker/           # background job runner (image pipeline, publish queue)
  packages/
    domain/           # typed trend/design/product domain models
    commerce/         # Shopify + Printify provider boundaries
    ai-free/          # HuggingFace / Transformers.js / Replicate adapters
    image-pipeline/   # QA, background removal, upscale, mockup compositing
    risk/             # trademark/copyright/policy gate
    db/               # Supabase + Drizzle schema
    config/           # environment/feature flags
```

### 1.2 AI Stack (Cloud/Free-Tier — No OpenAI/Anthropic)

| Need | Tool | Tier |
|---|---|---|
| Text generation (slogans, titles, descriptions) | Hugging Face Inference API (Mistral/Llama/Qwen models) | Free tier |
| Image generation (product art) | Hugging Face SDXL / FLUX endpoints | Free tier |
| Browser-side AI (search, similarity, suggestions) | Transformers.js | Free / client-side |
| Background removal | remove.bg free tier OR HF rembg endpoint | Free tier |
| Upscaling | Upscayl (local desktop app, used offline) OR HF ESRGAN endpoint | Free |
| Image QA | Sharp + custom checks (no paid API) | Free |
| Perceptual hashing / duplicate detection | sharp + blockhash-js | Free |

**Hard constraints locked:**
- No OpenAI API calls — enforced at provider boundary layer
- No Anthropic API calls — enforced at provider boundary layer
- No paid AI dependency required for core pipeline
- All AI provider calls are server-side only
- Free-tier rate limits must be handled gracefully (queue + retry)

### 1.3 Commerce Stack

| Layer | Tool | Notes |
|---|---|---|
| Commerce backend | Shopify | Admin API for publishing, Storefront API for public reads |
| POD fulfillment | Printify | Primary; Printful deferred |
| Database | Supabase Postgres | Drizzle ORM for typed schema |
| Asset storage | Supabase Storage | Private buckets for generated assets; public bucket for approved product images only |
| Storefront hosting | Vercel | Next.js on saltycowhide.com |
| Studio hosting | Vercel (private route) | Auth-gated /studio |

### 1.4 Secrets and Token Policy
- No Shopify Admin API token in any frontend bundle
- No Printify API token in any frontend bundle
- No HuggingFace API token in any frontend bundle
- All secrets in environment variables, never in database columns
- Supabase service-role key: server-side only, never exposed to browser
- Storefront API public token: only safe token allowed in client bundle

### 1.5 Publishing Guardrail Policy (Fail-Closed)
Publishing is disabled by default at every layer. Each gate must explicitly pass:

| Gate | Blocks |
|---|---|
| Human approval | Nothing publishes without explicit human approval action |
| Risk review | Trademark/IP/celebrity flags block until cleared |
| Print file QA | Resolution, transparency, margin, spelling flags block |
| Margin check | Margin-negative products cannot publish |
| Printify variant check | Unsupported variants block |
| Shopify preflight | Draft-only mode until all gates pass |

### 1.6 Asset Access Policy
- Generated assets (not yet approved): private Supabase storage bucket, signed URLs only
- Approved product images: public Supabase storage bucket, CDN-optimized path
- Generation prompts: never exposed to public storefront
- Raw trend signals: internal only, never public

---

## Section 2: System Route Map

### 2.1 Public Storefront — saltycowhide.com

```
/                           # Homepage — hero, featured collection, drop teaser
/collections                # All collections index
/collections/[slug]         # Collection page — product grid, filtered
/products/[handle]          # Product detail page — images, variants, add to cart
/cart                       # Cart page
/search                     # Search results
/drops                      # Upcoming / limited drop calendar
/drops/[slug]               # Drop landing page — countdown, products
/about                      # Brand story
/size-guide                 # Size chart
/faq                        # FAQ
/legal/privacy              # Privacy policy
/legal/terms                # Terms of service
```

### 2.2 Private Studio — /studio (auth-gated, not public)

```
/studio                     # Dashboard — pipeline summary, queue counts
/studio/trends              # Trend inbox
/studio/trends/[id]         # Trend signal detail
/studio/clusters            # Trend clusters
/studio/clusters/[id]       # Cluster detail + approve for generation
/studio/phrases             # Phrase candidates
/studio/phrases/[id]        # Phrase detail + risk status
/studio/briefs              # Design briefs
/studio/briefs/[id]         # Brief detail + generation controls
/studio/generate            # Generation queue — submit / monitor jobs
/studio/generate/[jobId]    # Job detail — status, output preview
/studio/assets              # Generated design assets
/studio/assets/[id]         # Asset QA detail + approve/reject
/studio/mockups             # Mockup assets
/studio/mockups/[id]        # Mockup detail
/studio/drafts              # Product drafts
/studio/drafts/[id]         # Draft detail + approval gate
/studio/publish             # Publish review queue
/studio/publish/[id]        # Publish review — all gates shown
/studio/products            # Published products (Shopify-synced)
/studio/products/[id]       # Product detail — Shopify + Printify refs
/studio/settings            # API preflight checks, provider status
```

### 2.3 API Routes (server-side only)

```
/api/studio/trends/ingest   # POST — ingest new trend signal
/api/studio/clusters/create # POST — create cluster from signals
/api/studio/phrases/generate # POST — run local text generation for phrases
/api/studio/briefs/create   # POST — create design brief
/api/studio/generate/submit # POST — submit to AI image generation queue
/api/studio/generate/status # GET  — poll job status
/api/studio/assets/qa       # POST — run image QA checks
/api/studio/mockups/generate # POST — run mockup compositor
/api/studio/drafts/create   # POST — assemble product draft
/api/studio/drafts/approve  # POST — human approval action
/api/studio/publish/shopify # POST — publish draft to Shopify (guarded)
/api/studio/publish/printify # POST — sync product to Printify (guarded)
/api/shopify/storefront/*   # Proxy for Storefront API (token never in client)
/api/webhooks/printify      # POST — Printify fulfillment webhook receiver
/api/webhooks/shopify       # POST — Shopify order webhook receiver
```

---

## Section 3: Database Table List

```
trend_sources
trend_signals
trend_clusters
trend_cluster_signals       (junction)
phrase_candidates
risk_reviews
design_briefs
generation_jobs
design_assets
print_file_qa
mockup_templates
mockup_assets
product_drafts
product_variants
price_margin_checks
publish_reviews
shopify_product_refs
printify_product_refs
fulfillment_events
audit_events
```

---

## Section 4: JSON Object Schemas

### 4.1 trend_source
```json
{
  "id": "tsrc_01",
  "name": "Pinterest Trends",
  "type": "pinterest_trends",
  "allowed_use": "inspiration_only",
  "requires_manual_import": true,
  "notes": "Official trend data only. No scraping. Manual export allowed.",
  "active": true,
  "created_at": "2026-06-29T00:00:00Z"
}
```

### 4.2 trend_signal
```json
{
  "id": "tsig_01",
  "source_id": "tsrc_01",
  "source_url": null,
  "captured_at": "2026-06-29T00:00:00Z",
  "keyword": "coastal cowgirl",
  "related_terms": ["beach rodeo", "cowgirl summer", "salty cowgirl", "turquoise rodeo"],
  "category": "fashion_pod",
  "region": "US",
  "season": "summer",
  "confidence": 0.74,
  "allowed_use": "inspiration_only",
  "status": "new",
  "cluster_id": null,
  "notes": "Directional signal only. Do not copy competitor phrasing or artwork.",
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

Status enum: `new` | `reviewed` | `clustered` | `archived` | `rejected`

### 4.3 trend_cluster
```json
{
  "id": "tclus_01",
  "name": "Coastal Cowgirl Summer",
  "signal_ids": ["tsig_01", "tsig_02"],
  "keywords": ["coastal cowgirl", "beach rodeo", "salty cowgirl"],
  "aesthetic_tags": ["western", "coastal", "turquoise", "cowhide", "distressed"],
  "seasonality": ["spring", "summer"],
  "target_customer": "women_25_55_western_coastal",
  "confidence": 0.81,
  "status": "pending_approval",
  "approved_for_generation": false,
  "approved_by": null,
  "approved_at": null,
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

Status enum: `pending_approval` | `approved` | `generating` | `complete` | `archived`

### 4.4 phrase_candidate
```json
{
  "id": "phrase_01",
  "cluster_id": "tclus_01",
  "text": "Beach Rodeo",
  "generated_by": "hf_mistral",
  "generation_prompt_ref": "prompt_phrase_western_coastal_v1",
  "status": "risk_review_required",
  "trademark_review": {
    "required": true,
    "status": "not_checked",
    "checked_by": null,
    "checked_at": null,
    "notes": []
  },
  "approved_for_design": false,
  "approved_by": null,
  "approved_at": null,
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

Status enum: `draft` | `risk_review_required` | `risk_cleared` | `approved` | `rejected`

### 4.5 risk_review
```json
{
  "id": "risk_01",
  "entity_type": "phrase_candidate",
  "entity_id": "phrase_01",
  "checks": {
    "trademark_risk": false,
    "celebrity_reference": false,
    "sports_team_reference": false,
    "brand_lookalike": false,
    "disney_ip_risk": false,
    "music_artist_reference": false,
    "tv_show_reference": false,
    "college_reference": false,
    "nfl_nba_reference": false,
    "profanity_flag": false,
    "competitor_copy_flag": false
  },
  "risk_score": 0.0,
  "status": "cleared",
  "reviewed_by": "human",
  "reviewer_id": "user_01",
  "reviewed_at": "2026-06-29T00:00:00Z",
  "notes": "No trademark risk found. Proceed.",
  "created_at": "2026-06-29T00:00:00Z"
}
```

Status enum: `pending` | `auto_flagged` | `cleared` | `blocked`

### 4.6 design_brief
```json
{
  "id": "brief_01",
  "phrase_id": "phrase_01",
  "cluster_id": "tclus_01",
  "collection": "Beach Rodeo",
  "product_targets": ["tee", "crewneck", "sticker", "tote"],
  "style_direction": {
    "primary_style": "vintage western coastal badge",
    "colors": ["turquoise", "sand", "black", "cream"],
    "textures": ["distressed ink", "worn print", "cowhide accent"],
    "layout": "centered badge with text arc",
    "avoid": [
      "celebrity references",
      "sports team logos",
      "Disney-style art",
      "brand lookalikes",
      "realistic faces",
      "copyrighted characters"
    ]
  },
  "generation_prompt": "vintage western coastal badge, turquoise and sand palette, distressed ink texture, cowhide accent, no text, transparent background",
  "negative_prompt": "misspelled text, fake logos, brand names, team names, faces, photorealistic, NSFW",
  "status": "pending_approval",
  "approved_for_generation": false,
  "approved_by": null,
  "approved_at": null,
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

Status enum: `draft` | `pending_approval` | `approved` | `generating` | `complete` | `archived`

### 4.7 generation_job
```json
{
  "id": "genjob_01",
  "brief_id": "brief_01",
  "provider": "hf_sdxl",
  "model": "stabilityai/stable-diffusion-xl-base-1.0",
  "prompt": "vintage western coastal badge, turquoise and sand palette, distressed ink texture",
  "negative_prompt": "misspelled text, fake logos, brand names, team names",
  "parameters": {
    "width": 1024,
    "height": 1024,
    "steps": 30,
    "guidance_scale": 7.5,
    "seed": 42
  },
  "status": "queued",
  "retry_count": 0,
  "max_retries": 3,
  "output_asset_id": null,
  "error": null,
  "queued_at": "2026-06-29T00:00:00Z",
  "started_at": null,
  "completed_at": null,
  "created_at": "2026-06-29T00:00:00Z"
}
```

Status enum: `queued` | `running` | `completed` | `failed` | `cancelled`

### 4.8 design_asset
```json
{
  "id": "asset_01",
  "job_id": "genjob_01",
  "brief_id": "brief_01",
  "asset_type": "print_art",
  "storage_bucket": "assets-private",
  "file_path": "generated/asset_01.png",
  "file_size_bytes": 2048000,
  "width": 4500,
  "height": 5400,
  "dpi": 300,
  "transparent_background": true,
  "generator": "hf_sdxl",
  "model": "stabilityai/stable-diffusion-xl-base-1.0",
  "qa_status": "pending",
  "risk_status": "pending",
  "approved_for_mockup": false,
  "approved_by": null,
  "approved_at": null,
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

### 4.9 print_file_qa
```json
{
  "id": "qa_01",
  "asset_id": "asset_01",
  "checks": {
    "resolution_ok": true,
    "min_dpi_met": true,
    "canvas_size_ok": true,
    "transparent_background_ok": true,
    "safe_margin_ok": true,
    "text_detected": false,
    "text_legible": null,
    "spelling_review_required": false,
    "perceptual_hash": "a1b2c3d4e5f6",
    "duplicate_similarity_score": 0.08,
    "duplicate_of": null,
    "copyright_risk_flag": false,
    "trademark_risk_flag": false,
    "color_profile_ok": true,
    "file_format_ok": true
  },
  "status": "passed",
  "blocked_reasons": [],
  "approved_for_product_draft": true,
  "reviewed_at": "2026-06-29T00:00:00Z",
  "created_at": "2026-06-29T00:00:00Z"
}
```

Status enum: `pending` | `running` | `passed` | `failed` | `blocked`

### 4.10 mockup_template
```json
{
  "id": "mtemplate_01",
  "name": "White Tee — Front Center",
  "product_type": "tee",
  "printify_blueprint_id": "5",
  "canvas": {
    "width": 2000,
    "height": 2400,
    "art_zone": {
      "x": 600,
      "y": 400,
      "width": 800,
      "height": 960
    }
  },
  "base_image_path": "mockup-templates/white-tee-front.png",
  "color_variants": ["white", "ivory", "black", "heather_gray"],
  "active": true,
  "created_at": "2026-06-29T00:00:00Z"
}
```

### 4.11 mockup_asset
```json
{
  "id": "mockup_01",
  "asset_id": "asset_01",
  "template_id": "mtemplate_01",
  "product_draft_id": "draft_01",
  "color_variant": "ivory",
  "storage_bucket": "assets-private",
  "file_path": "mockups/mockup_01.jpg",
  "width": 2000,
  "height": 2400,
  "status": "generated",
  "approved_for_product": false,
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

### 4.12 product_draft
```json
{
  "id": "draft_01",
  "brand": "Salty Cowhide Co.",
  "title": "Beach Rodeo Western Graphic Tee",
  "description": "Hit the beach with a little western flair. The Beach Rodeo tee pairs coastal vibes with classic cowgirl style. [Pending human edit before publish.]",
  "product_type": "tee",
  "collection": "Beach Rodeo",
  "tags": ["western tee", "coastal cowgirl", "cowgirl shirt", "beach rodeo", "salty cowhide"],
  "brief_id": "brief_01",
  "asset_id": "asset_01",
  "mockup_ids": ["mockup_01", "mockup_02"],
  "variant_ids": ["var_01", "var_02", "var_03"],
  "shopify_status": "not_published",
  "printify_status": "not_synced",
  "approval_status": "pending",
  "approved_by": null,
  "approved_at": null,
  "publish_review_id": null,
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

Status enum: `draft` | `pending_approval` | `approved` | `publishing` | `published` | `archived`

### 4.13 product_variant
```json
{
  "id": "var_01",
  "product_draft_id": "draft_01",
  "sku": "SC-BR-TEE-IVY-S",
  "size": "S",
  "color": "ivory",
  "color_hex": "#FFFFF0",
  "printify_variant_id": "17390",
  "printify_blueprint_id": "5",
  "printify_print_provider_id": "99",
  "cost": 12.50,
  "price": 32.00,
  "compare_at_price": null,
  "margin_dollars": 19.50,
  "margin_percent": 60.9,
  "margin_ok": true,
  "weight_oz": 5.5,
  "active": true,
  "created_at": "2026-06-29T00:00:00Z"
}
```

### 4.14 price_margin_check
```json
{
  "id": "margin_01",
  "product_draft_id": "draft_01",
  "variant_id": "var_01",
  "cost": 12.50,
  "price": 32.00,
  "shopify_fee_estimate": 0.00,
  "printify_shipping_estimate": 4.99,
  "platform_fee_estimate": 0.90,
  "net_revenue_estimate": 14.61,
  "margin_percent": 45.7,
  "minimum_margin_threshold": 40.0,
  "margin_ok": true,
  "blocked": false,
  "created_at": "2026-06-29T00:00:00Z"
}
```

### 4.15 publish_review
```json
{
  "id": "pubrev_01",
  "product_draft_id": "draft_01",
  "gates": {
    "human_approved": false,
    "risk_checks_passed": true,
    "print_file_qa_passed": true,
    "margin_checks_passed": true,
    "mockups_complete": true,
    "title_reviewed": false,
    "description_reviewed": false,
    "tags_reviewed": false,
    "printify_variants_valid": true,
    "shopify_collection_assigned": false
  },
  "all_gates_passed": false,
  "shopify_publish_allowed": false,
  "printify_sync_allowed": false,
  "reviewed_by": null,
  "reviewed_at": null,
  "notes": ["Human approval pending.", "Title and description require human review before publish."],
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

### 4.16 shopify_product_ref
```json
{
  "id": "shopref_01",
  "product_draft_id": "draft_01",
  "shopify_product_id": "8123456789",
  "shopify_handle": "beach-rodeo-western-graphic-tee",
  "shopify_status": "draft",
  "shopify_published_at": null,
  "shopify_collection_ids": ["456789123"],
  "shopify_variant_ids": {
    "var_01": "64321987",
    "var_02": "64321988"
  },
  "synced_at": "2026-06-29T00:00:00Z",
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

### 4.17 printify_product_ref
```json
{
  "id": "ptyref_01",
  "product_draft_id": "draft_01",
  "printify_product_id": "64a1b2c3d4e5f6",
  "printify_shop_id": "12345678",
  "printify_blueprint_id": "5",
  "printify_print_provider_id": "99",
  "printify_status": "draft",
  "printify_published": false,
  "printify_external_id": "shopref_01",
  "synced_at": "2026-06-29T00:00:00Z",
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

### 4.18 fulfillment_event
```json
{
  "id": "fulfil_01",
  "shopify_product_ref_id": "shopref_01",
  "printify_product_ref_id": "ptyref_01",
  "event_type": "order_created",
  "shopify_order_id": "5001234567",
  "printify_order_id": "ord_abc123",
  "status": "pending",
  "line_items": [
    {
      "sku": "SC-BR-TEE-IVY-S",
      "quantity": 1,
      "printify_variant_id": "17390"
    }
  ],
  "shipped_at": null,
  "tracking_number": null,
  "tracking_url": null,
  "carrier": null,
  "raw_webhook_payload_ref": "webhook_01",
  "created_at": "2026-06-29T00:00:00Z",
  "updated_at": "2026-06-29T00:00:00Z"
}
```

### 4.19 audit_event
```json
{
  "id": "audit_01",
  "entity_type": "product_draft",
  "entity_id": "draft_01",
  "action": "approval_granted",
  "actor_type": "human",
  "actor_id": "user_01",
  "before_state": "pending_approval",
  "after_state": "approved",
  "notes": "Reviewed all gates. Title edited. Approved for Shopify draft publish.",
  "created_at": "2026-06-29T00:00:00Z"
}
```

---

## Section 5: Provider Boundary Interfaces

All providers follow the same pattern: a typed interface, a real implementation, and a disabled/stub implementation. The disabled stub is the **default**. Real implementations are enabled by feature flag, never auto-wired.

### 5.1 LocalTextProvider (adapted: FreeTextProvider)
```typescript
interface FreeTextProvider {
  readonly providerId: 'hf_mistral' | 'hf_llama' | 'hf_qwen' | 'disabled';
  readonly enabled: boolean;
  generatePhrases(brief: string, count: number): Promise<TextGenerationResult>;
  generateTitle(context: TitleContext): Promise<TextGenerationResult>;
  generateDescription(context: DescriptionContext): Promise<TextGenerationResult>;
  generateTags(context: TagContext): Promise<TextGenerationResult>;
  isHealthy(): Promise<boolean>;
}

type TextGenerationResult =
  | { ok: true; outputs: string[]; modelUsed: string; latencyMs: number }
  | { ok: false; error: string; retryable: boolean };
```

### 5.2 FreeImageProvider
```typescript
interface FreeImageProvider {
  readonly providerId: 'hf_sdxl' | 'hf_flux' | 'replicate_free' | 'disabled';
  readonly enabled: boolean;
  generateImage(prompt: string, negativePrompt: string, params: ImageGenParams): Promise<ImageGenResult>;
  getJobStatus(jobId: string): Promise<ImageJobStatus>;
  isHealthy(): Promise<boolean>;
}

type ImageGenResult =
  | { ok: true; imageUrl: string; jobId: string; modelUsed: string }
  | { ok: false; error: string; retryable: boolean };
```

### 5.3 BackgroundRemovalProvider
```typescript
interface BackgroundRemovalProvider {
  readonly providerId: 'removebg_free' | 'hf_rembg' | 'disabled';
  readonly enabled: boolean;
  removeBackground(inputPath: string, outputPath: string): Promise<BgRemovalResult>;
  isHealthy(): Promise<boolean>;
}
```

### 5.4 UpscaleProvider
```typescript
interface UpscaleProvider {
  readonly providerId: 'hf_esrgan' | 'disabled';
  readonly enabled: boolean;
  upscale(inputPath: string, outputPath: string, scale: 2 | 4): Promise<UpscaleResult>;
  isHealthy(): Promise<boolean>;
}
```

### 5.5 ImageQaProvider
```typescript
interface ImageQaProvider {
  readonly providerId: 'sharp_local' | 'disabled';
  readonly enabled: boolean;
  runQa(assetPath: string, rules: QaRuleSet): Promise<PrintFileQaResult>;
  computePerceptualHash(assetPath: string): Promise<string>;
  checkDuplicate(hash: string, existingHashes: string[]): Promise<DuplicateCheckResult>;
}
```

### 5.6 MockupProvider
```typescript
interface MockupProvider {
  readonly providerId: 'sharp_compositor' | 'disabled';
  readonly enabled: boolean;
  generateMockup(artPath: string, template: MockupTemplate, variant: ColorVariant): Promise<MockupResult>;
}
```

### 5.7 ShopifyStorefrontProvider
```typescript
interface ShopifyStorefrontProvider {
  getProducts(options: ProductQueryOptions): Promise<ShopifyProductList>;
  getProduct(handle: string): Promise<ShopifyProduct | null>;
  getCollections(): Promise<ShopifyCollectionList>;
  getCollection(handle: string): Promise<ShopifyCollection | null>;
  createCart(): Promise<ShopifyCart>;
  addToCart(cartId: string, lines: CartLine[]): Promise<ShopifyCart>;
  getCart(cartId: string): Promise<ShopifyCart | null>;
}
// Public token only — safe for storefront bundle
```

### 5.8 ShopifyAdminProvider
```typescript
interface ShopifyAdminProvider {
  // Server-side only — Admin token never leaves server
  createProductDraft(product: ShopifyProductInput): Promise<ShopifyProductRef>;
  updateProduct(id: string, updates: Partial<ShopifyProductInput>): Promise<ShopifyProductRef>;
  publishProduct(id: string): Promise<ShopifyProductRef>;
  getProduct(id: string): Promise<ShopifyProductRef>;
  assignCollection(productId: string, collectionId: string): Promise<void>;
  uploadImage(productId: string, imageUrl: string, altText: string): Promise<ShopifyImageRef>;
  isHealthy(): Promise<boolean>;
}
```

### 5.9 PrintifyProvider
```typescript
interface PrintifyProvider {
  // Server-side only — Printify token never leaves server
  getCatalog(): Promise<PrintifyBlueprintList>;
  getBlueprint(blueprintId: string): Promise<PrintifyBlueprint>;
  getVariants(blueprintId: string, printProviderId: string): Promise<PrintifyVariantList>;
  createProduct(product: PrintifyProductInput): Promise<PrintifyProductRef>;
  publishProduct(productId: string): Promise<void>;
  getProduct(productId: string): Promise<PrintifyProductRef>;
  handleFulfillmentWebhook(payload: unknown): Promise<FulfillmentEvent>;
  isHealthy(): Promise<boolean>;
}
// Rate limit: 600 req/min global, 100 req/min catalog — enforced in adapter
```

### 5.10 TrendSourceProvider
```typescript
interface TrendSourceProvider {
  readonly sourceId: string;
  readonly allowedUse: 'inspiration_only' | 'data_reference';
  ingestSignals(input: TrendImportInput): Promise<TrendSignal[]>;
  // No scraping. Manual import or official API only.
}
```

---

## Section 6: State Machines

### 6.1 Trend Signal Lifecycle
```
new → reviewed → clustered → archived
new → rejected
reviewed → rejected
```

### 6.2 Phrase Lifecycle
```
draft → risk_review_required → risk_cleared → approved → [design brief created]
draft → risk_review_required → blocked
risk_cleared → rejected
approved → archived
```

### 6.3 Design Brief Lifecycle
```
draft → pending_approval → approved → generating → complete
pending_approval → rejected
approved → archived
generating → failed → approved (retry)
```

### 6.4 Generation Job Lifecycle
```
queued → running → completed → [asset created]
queued → cancelled
running → failed → queued (retry, max 3)
running → failed → cancelled (max retries exceeded)
```

### 6.5 Asset QA Lifecycle
```
pending → running → passed → [eligible for mockup]
pending → running → failed → [blocked]
passed → approved_for_mockup
failed → rejected
blocked → [manual review required]
```

### 6.6 Product Draft Lifecycle
```
draft → pending_approval → approved → publishing → published
pending_approval → rejected
approved → archived
publishing → failed → approved (retry)
published → archived
```

### 6.7 Publish Lifecycle
```
[all gates evaluated]
  → any gate fails → blocked (cannot publish)
  → all gates pass + human_approved = false → pending_human_approval
  → all gates pass + human_approved = true → shopify_draft_created
    → shopify_draft_created → printify_synced → live
```

**Critical rule:** `shopify_publish_allowed` and `printify_sync_allowed` both remain `false` until every gate in `publish_review.gates` is `true`. These are not overridable by any automated path.

---

## Section 7: Build Plan (12 Codex-Sized Builds)

### Build 1 — Architecture, Schema, Provider Boundaries ✅ (this document)
Locked decisions, all JSON schemas, provider interfaces, state machines, route map, guardrail spec, build plan.

### Build 2 — Monorepo Scaffold + Domain Package
pnpm monorepo setup, `packages/domain` with typed Zod schemas for all 19 objects, `packages/config` with feature flags (all providers disabled by default), `packages/db` with Drizzle schema matching all tables. No live DB connection. No UI. Tests: schema validation on all 19 objects.

### Build 3 — Storefront Shell
`apps/storefront` Next.js 14 App Router. All routes scaffolded with typed mock data from `packages/domain`. Product page, collection page, cart page, drop calendar page. Shopify Storefront API wired via provider boundary but **disabled by default** — pages render from local typed fixture data. Tests: all routes render without errors, no live API calls in test mode.

### Build 4 — Studio Shell + Pipeline UI
`apps/studio` with auth gate (Supabase Auth, email only). All studio routes scaffolded. Trend inbox, cluster view, phrase list, brief list, draft queue, publish queue — all rendering from fixture data. No real pipeline logic yet. Tests: all studio routes require auth, unauthenticated requests redirect.

### Build 5 — Trend + Phrase + Brief Pipeline
Manual trend signal ingestion form. Cluster creation from signals. Phrase candidate generation via `FreeTextProvider` (HuggingFace Mistral endpoint, disabled by default — runs from fixture in test mode). Risk review UI. Design brief creation. Tests: trend → cluster → phrase → brief flow with fixture provider; disabled provider returns safe stub.

### Build 6 — Free Image Generation Boundary
`packages/ai-free` with `FreeImageProvider` interface. HuggingFace SDXL adapter. Generation job queue in Supabase. Studio generation queue UI with status polling. **Disabled by default in all environments except explicit `AI_IMAGE_ENABLED=true`.** Tests: disabled provider returns blocked result; enabled provider mocked with fixture image response.

### Build 7 — Image QA + Background Removal + Upscale
`packages/image-pipeline`. Sharp-based QA checks (resolution, canvas, transparency, safe margin, perceptual hash). `BackgroundRemovalProvider` boundary (HF rembg, disabled by default). `UpscaleProvider` boundary (HF ESRGAN, disabled by default). Tests: QA catches undersized images, catches missing transparency, catches duplicate hash.

### Build 8 — Mockup Compositor
Sharp-based mockup compositor in `packages/image-pipeline`. `MockupProvider` implementation. Mockup template management in studio. Generates composite product image from art + template + color variant. Tests: compositor produces output at expected dimensions; compositor fails closed if art QA not passed.

### Build 9 — Shopify Storefront Read Path (Live)
Enable `ShopifyStorefrontProvider` with real Shopify Storefront API. Storefront pages now read from real Shopify product/collection data. Public token in environment variable, proxied through API route — never in client bundle. Tests: storefront API returns products; cart creation works; product handle resolves.

### Build 10 — Shopify Admin Draft Publisher (Guarded)
`ShopifyAdminProvider` live implementation. `publish_review` gate evaluation. Studio "Publish to Shopify Draft" action — only available when all gates pass AND `human_approved = true`. Creates Shopify product in **draft** status (not live). Tests: publish blocked when any gate fails; publish blocked when human_approved = false; draft created successfully when all gates pass.

### Build 11 — Printify Catalog + Product Sync (Guarded)
`PrintifyProvider` live implementation. Catalog browser in studio (blueprint + variant lookup). Printify product creation behind the same publish gate as Build 10. Rate limiting enforced in adapter (600/min global, 100/min catalog). Fulfillment webhook receiver. Tests: product creation blocked without approval; rate limiter fires correctly; webhook receiver validates signature before processing.

### Build 12 — Analytics Feedback Loop
Order/fulfillment tracking in studio dashboard. Product performance visible (Shopify orders → fulfillment events). Trend → cluster → product → order linkage. Basic "what's selling" signal feeds back into trend confidence scores. Tests: fulfillment event correctly linked to product draft → brief → cluster.

---

## Section 8: Required Tests Per Boundary

| Boundary | Required Tests |
|---|---|
| All providers | disabled provider returns safe blocked result |
| FreeTextProvider | rate limit response handled gracefully |
| FreeImageProvider | prompt injection not possible through brief text |
| ImageQaProvider | rejects < 300 DPI; rejects missing transparency; rejects duplicate hash |
| MockupProvider | fails if asset QA not passed |
| ShopifyAdminProvider | publish blocked without human approval; Admin token never in test output |
| PrintifyProvider | publish blocked without human approval; rate limit enforced |
| publish_review | all gates must be true for publish_allowed = true; single false gate blocks all |
| audit_event | every approval, rejection, and publish action creates an audit event |
| studio routes | all /studio/* routes return 401/redirect without valid session |

---

## Section 9: Risks and Legal/Compliance Notes

### AI-Generated Content
- HuggingFace free tier has rate limits and may have queue delays — all generation must be async with graceful failure
- AI-generated images may resemble existing designs — perceptual hash check + human review is mandatory before publish
- AI text generation can produce misspellings — human title/description review gate is mandatory

### Trademark and IP
- "Beach Rodeo," "Coastal Cowgirl," "Salty" — all must be checked against USPTO TESS before approval
- No celebrity names, band names, TV/movie titles, sports teams, schools, or brand-adjacent phrases
- No Disney, NFL, NBA, NCAA, country artist names, Yellowstone/Dutton references, Taylor Swift, Beyoncé, etc.
- Etsy and Shopify both actively remove IP-infringing listings — a single violation can suspend the account

### Print-on-Demand Compliance
- Printify requires compliance with their Content Policy — review before launching
- Shopify requires compliance with their Acceptable Use Policy
- All designs must be original or properly licensed

### HuggingFace Free Tier Limits
- Free Inference API has daily/monthly request limits and may return 503 under load
- Image generation on free tier is queued and may take minutes — UI must handle async status
- Free tier models may be deprecated — provider boundary pattern allows model swap without app changes

### Data Privacy
- No customer PII stored beyond what Shopify/Printify manage
- Studio access must be authenticated — Supabase Auth with email verification minimum
- Supabase service-role key must never appear in any client bundle or public environment variable

### Financial
- Minimum margin threshold: 40% net after Printify cost + platform fees — configurable, enforced at gate
- Printify base costs change — margin check must re-run before any republish

---

## Appendix A: Free AI Tools Summary for saltycowhide.com

| Tool | What It Does on the Site | Where |
|---|---|---|
| HuggingFace Inference API (Mistral/Llama) | Product title, description, tag generation | Studio only |
| HuggingFace SDXL/FLUX | Product art generation | Studio only |
| Transformers.js | Client-side semantic search, product recommendations | Public storefront |
| HuggingFace rembg | Background removal from generated art | Studio worker |
| HuggingFace ESRGAN | Upscaling low-res generated art | Studio worker |
| Sharp (free Node.js lib) | Image QA, mockup compositing, resize | Studio worker |
| blockhash-js | Perceptual duplicate detection | Studio worker |

**Note:** All AI generation is studio-only and never exposed to the public storefront. The public storefront only receives approved, human-reviewed product images.

---

*SaltyFactory Build 1 Complete. Proceed to Build 2: Monorepo Scaffold + Domain Package.*
