import { now } from "@saltyfactory/domain";

export const workspaceA = "wks_a";
export const workspaceB = "wks_b";
export const actor = "user_01";

export const allTrueGates = {
  human_approved: true,
  risk_checks_passed: true,
  print_file_qa_passed: true,
  margin_checks_passed: true,
  mockups_complete: true,
  title_reviewed: true,
  description_reviewed: true,
  tags_reviewed: true,
  printify_variants_valid: true,
  shopify_collection_assigned: true
};

export const allFalseGates = Object.fromEntries(Object.keys(allTrueGates).map((key) => [key, false])) as typeof allTrueGates;

export const riskChecks = {
  trademark_risk: false,
  celebrity_reference: false,
  sports_team_reference: false,
  brand_lookalike: false,
  disney_ip_risk: false,
  music_artist_reference: false,
  tv_show_reference: false,
  college_reference: false,
  nfl_nba_reference: false,
  profanity_flag: false,
  competitor_copy_flag: false
};

export const validDomainFixtures = {
  trendSource: { id: "tsrc_01", name: "Manual", type: "manual", allowed_use: "inspiration_only", requires_manual_import: true, notes: "No scraping", active: true, created_at: now },
  trendSignal: { id: "tsig_01", source_id: "tsrc_01", source_url: null, captured_at: now, keyword: "coastal cowgirl", related_terms: ["beach rodeo"], category: "fashion_pod", region: "US", season: "summer", confidence: 0.7, allowed_use: "inspiration_only", status: "new", cluster_id: null, notes: null, created_at: now, updated_at: now },
  trendCluster: { id: "tclus_01", name: "Coastal Cowgirl Summer", signal_ids: ["tsig_01"], keywords: ["coastal cowgirl"], aesthetic_tags: ["western"], seasonality: ["summer"], target_customer: "women_25_55", confidence: 0.81, status: "pending_approval", approved_for_generation: false, approved_by: null, approved_at: null, created_at: now, updated_at: now },
  trendClusterSignal: { id: "tclsig_01", cluster_id: "tclus_01", signal_id: "tsig_01", created_at: now },
  phraseCandidate: { id: "phrase_01", cluster_id: "tclus_01", text: "Beach Rodeo", generated_by: "hf_mistral", generation_prompt_ref: "prompt_01", status: "risk_review_required", trademark_review: { required: true, status: "not_checked", checked_by: null, checked_at: null, notes: [] }, approved_for_design: false, approved_by: null, approved_at: null, created_at: now, updated_at: now },
  riskReview: { id: "risk_01", entity_type: "phrase_candidate", entity_id: "phrase_01", checks: riskChecks, risk_score: 0, status: "cleared", reviewed_by: "human", reviewer_id: "user_01", reviewed_at: now, notes: "ok", created_at: now },
  designBrief: { id: "brief_01", phrase_id: "phrase_01", cluster_id: "tclus_01", collection: "Beach Rodeo", product_targets: ["tee"], style_direction: { colors: ["turquoise"] }, generation_prompt: "western coastal badge", negative_prompt: "logos", status: "pending_approval", approved_for_generation: false, approved_by: null, approved_at: null, created_at: now, updated_at: now },
  generationJob: { id: "genjob_01", brief_id: "brief_01", provider: "hf_sdxl", model: "sdxl", prompt: "badge", negative_prompt: "logos", parameters: { width: 1024 }, status: "queued", retry_count: 0, max_retries: 3, output_asset_id: null, error: null, queued_at: now, started_at: null, completed_at: null, created_at: now },
  designAsset: { id: "asset_01", job_id: "genjob_01", brief_id: "brief_01", asset_type: "print_art", storage_bucket: "assets-private", file_path: "generated/a.png", file_size_bytes: 2048, width: 4500, height: 5400, dpi: 300, transparent_background: true, generator: "hf_sdxl", model: "sdxl", qa_status: "pending", risk_status: "pending", approved_for_mockup: false, approved_by: null, approved_at: null, created_at: now, updated_at: now },
  printFileQa: { id: "qa_01", asset_id: "asset_01", checks: { resolution_ok: true }, status: "passed", blocked_reasons: [], approved_for_product_draft: true, reviewed_at: now, created_at: now },
  mockupTemplate: { id: "mtemplate_01", name: "Tee", product_type: "tee", printify_blueprint_id: "5", canvas: { width: 2000 }, base_image_path: "mockups/base.png", color_variants: ["white"], active: true, created_at: now },
  mockupAsset: { id: "mockup_01", asset_id: "asset_01", template_id: "mtemplate_01", product_draft_id: "draft_01", color_variant: "ivory", storage_bucket: "assets-private", file_path: "mockups/a.jpg", width: 2000, height: 2400, status: "generated", approved_for_product: false, created_at: now, updated_at: now },
  productDraft: { id: "draft_01", brand: "Salty Cowhide Co.", title: "Beach Rodeo Tee", description: "Western coastal tee", product_type: "tee", collection: "Beach Rodeo", tags: ["western"], brief_id: "brief_01", asset_id: "asset_01", mockup_ids: ["mockup_01"], variant_ids: ["var_01"], shopify_status: "not_published", printify_status: "not_synced", approval_status: "pending", status: "draft", approved_by: null, approved_at: null, publish_review_id: null, created_at: now, updated_at: now },
  productVariant: { id: "var_01", product_draft_id: "draft_01", sku: "SC-BR-TEE-S", size: "S", color: "ivory", color_hex: "#fffff0", printify_variant_id: "17390", printify_blueprint_id: "5", printify_print_provider_id: "99", cost: 12.5, price: 32, compare_at_price: null, margin_dollars: 19.5, margin_percent: 60.9, margin_ok: true, weight_oz: 5.5, active: true, created_at: now },
  priceMarginCheck: { id: "margin_01", product_draft_id: "draft_01", variant_id: "var_01", cost: 12.5, price: 32, shopify_fee_estimate: 0, printify_shipping_estimate: 4.99, platform_fee_estimate: 0.9, net_revenue_estimate: 14.61, margin_percent: 45.7, minimum_margin_threshold: 40, margin_ok: true, blocked: false, created_at: now },
  publishReview: { id: "pubrev_01", product_draft_id: "draft_01", gates: allTrueGates, all_gates_passed: true, shopify_publish_allowed: true, printify_sync_allowed: true, reviewed_by: "user_01", reviewed_at: now, notes: [], created_at: now, updated_at: now },
  shopifyProductRef: { id: "shopref_01", product_draft_id: "draft_01", shopify_product_id: "8123456789", shopify_handle: "beach-rodeo-tee", shopify_status: "draft", shopify_published_at: null, shopify_collection_ids: ["123"], shopify_variant_ids: { var_01: "456" }, synced_at: now, created_at: now, updated_at: now },
  printifyProductRef: { id: "ptyref_01", product_draft_id: "draft_01", printify_product_id: "64a", printify_shop_id: "123", printify_blueprint_id: "5", printify_print_provider_id: "99", printify_status: "draft", printify_published: false, printify_external_id: "shopref_01", synced_at: now, created_at: now, updated_at: now },
  fulfillmentEvent: { id: "fulfil_01", shopify_product_ref_id: "shopref_01", printify_product_ref_id: "ptyref_01", event_type: "order_created", shopify_order_id: "500", printify_order_id: "ord_1", status: "pending", line_items: [{ sku: "SC-BR-TEE-S" }], shipped_at: null, tracking_number: null, tracking_url: null, carrier: null, raw_webhook_payload_ref: "webhook_01", created_at: now, updated_at: now },
  auditEvent: { id: "audit_01", entity_type: "product_draft", entity_id: "draft_01", action: "approval_granted", actor_type: "human", actor_id: "user_01", before_state: "pending", after_state: "approved", notes: "ok", created_at: now }
};
