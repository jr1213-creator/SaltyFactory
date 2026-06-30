CREATE TABLE "ai_employee_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"employee_id" text,
	"run_id" text,
	"task_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_employee_outputs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"run_id" text NOT NULL,
	"output_type" text NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"output_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"storage_bucket" text,
	"file_path" text,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_employee_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"permission_key" text NOT NULL,
	"allowed" boolean DEFAULT false NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"scope_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"granted_by" text,
	"granted_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_employee_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"employee_id" text,
	"task_id" text,
	"employee_type" text NOT NULL,
	"task_type" text NOT NULL,
	"input_ref_type" text,
	"input_ref_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_used" text,
	"model_used" text,
	"prompt_ref" text,
	"output_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"blocked_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requires_human_review" boolean DEFAULT true NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_employee_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"employee_id" text,
	"employee_type" text NOT NULL,
	"task_type" text NOT NULL,
	"input_ref_type" text,
	"input_ref_id" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"requested_by" text,
	"due_at" timestamp with time zone,
	"instructions" text,
	"input_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_employees" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"employee_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'disabled' NOT NULL,
	"provider_preference" text,
	"model_preference" text,
	"allowed_task_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requires_human_approval" boolean DEFAULT true NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"before_state" text,
	"after_state" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"workspace_id" text,
	"subscription_id" text,
	"event_type" text NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"provider_event_id" text,
	"amount_cents" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"audience" text NOT NULL,
	"brand_voice" text NOT NULL,
	"style_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "connected_stores" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_type" text NOT NULL,
	"store_name" text NOT NULL,
	"store_domain" text,
	"external_store_id" text,
	"connection_id" text,
	"status" text DEFAULT 'disabled' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "customer_support_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"macro_id" text,
	"customer_ref" text,
	"order_ref" text,
	"channel" text DEFAULT 'email' NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"requires_human_review" boolean DEFAULT true NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "design_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"job_id" text,
	"brief_id" text NOT NULL,
	"asset_type" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"dpi" integer NOT NULL,
	"transparent_background" boolean DEFAULT false NOT NULL,
	"generator" text NOT NULL,
	"model" text NOT NULL,
	"qa_status" text DEFAULT 'pending' NOT NULL,
	"risk_status" text DEFAULT 'pending' NOT NULL,
	"approved_for_mockup" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "design_briefs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"phrase_id" text NOT NULL,
	"cluster_id" text NOT NULL,
	"collection" text NOT NULL,
	"product_targets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"style_direction" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generation_prompt" text NOT NULL,
	"negative_prompt" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_for_generation" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "drop_calendars" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"collection_plan_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"launch_at" timestamp with time zone,
	"close_at" timestamp with time zone,
	"product_draft_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"public_visibility" text DEFAULT 'hidden' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "feature_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"feature_key" text NOT NULL,
	"limit_value" integer,
	"limit_window" text,
	"hard_limit" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shopify_product_ref_id" text,
	"printify_product_ref_id" text,
	"event_type" text NOT NULL,
	"shopify_order_id" text,
	"printify_order_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shipped_at" timestamp with time zone,
	"tracking_number" text,
	"tracking_url" text,
	"carrier" text,
	"raw_webhook_payload_ref" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"brief_id" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"negative_prompt" text NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"output_asset_id" text,
	"error" text,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "marketing_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"product_draft_id" text,
	"asset_type" text NOT NULL,
	"channel" text NOT NULL,
	"storage_bucket" text,
	"file_path" text,
	"copy_text" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"objective" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"product_draft_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"marketing_asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"performance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mockup_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"asset_id" text NOT NULL,
	"template_id" text NOT NULL,
	"product_draft_id" text,
	"color_variant" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"file_path" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"approved_for_product" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mockup_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"product_type" text NOT NULL,
	"printify_blueprint_id" text,
	"canvas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"base_image_path" text NOT NULL,
	"color_variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"invited_by" text,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_user_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"billing_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phrase_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cluster_id" text NOT NULL,
	"text" text NOT NULL,
	"generated_by" text NOT NULL,
	"generation_prompt_ref" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"trademark_review" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approved_for_design" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"billing_interval" text DEFAULT 'month' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"feature_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_margin_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"product_draft_id" text NOT NULL,
	"variant_id" text,
	"cost" numeric(12, 2) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"shopify_fee_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"printify_shipping_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"platform_fee_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"net_revenue_estimate" numeric(12, 2) NOT NULL,
	"margin_percent" numeric(7, 3) NOT NULL,
	"minimum_margin_threshold" numeric(7, 3) DEFAULT '40' NOT NULL,
	"margin_ok" boolean DEFAULT false NOT NULL,
	"blocked" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "print_file_qa" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"asset_id" text NOT NULL,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"blocked_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_for_product_draft" boolean DEFAULT false NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "printify_product_refs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"product_draft_id" text NOT NULL,
	"connected_store_id" text,
	"printify_product_id" text NOT NULL,
	"printify_shop_id" text NOT NULL,
	"printify_blueprint_id" text NOT NULL,
	"printify_print_provider_id" text NOT NULL,
	"printify_status" text DEFAULT 'draft' NOT NULL,
	"printify_published" boolean DEFAULT false NOT NULL,
	"printify_external_id" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_collection_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"brand_profile_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"season" text,
	"target_launch_at" timestamp with time zone,
	"product_targets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_cluster_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'planning' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"brand" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"product_type" text NOT NULL,
	"collection" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brief_id" text,
	"asset_id" text,
	"mockup_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"variant_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shopify_status" text DEFAULT 'not_published' NOT NULL,
	"printify_status" text DEFAULT 'not_synced' NOT NULL,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"publish_review_id" text,
	"public_handle" text,
	"public_projection" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"product_draft_id" text NOT NULL,
	"sku" text NOT NULL,
	"size" text NOT NULL,
	"color" text NOT NULL,
	"color_hex" text,
	"printify_variant_id" text,
	"printify_blueprint_id" text,
	"printify_print_provider_id" text,
	"cost" numeric(12, 2) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"compare_at_price" numeric(12, 2),
	"margin_dollars" numeric(12, 2) NOT NULL,
	"margin_percent" numeric(7, 3) NOT NULL,
	"margin_ok" boolean DEFAULT false NOT NULL,
	"weight_oz" numeric(8, 2),
	"active" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "provider_connection_status" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_connection_id" text NOT NULL,
	"provider_type" text NOT NULL,
	"status" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"latency_ms" integer,
	"error_code" text,
	"error_message" text,
	"response_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"product_draft_id" text NOT NULL,
	"gates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"all_gates_passed" boolean DEFAULT false NOT NULL,
	"shopify_publish_allowed" boolean DEFAULT false NOT NULL,
	"printify_sync_allowed" boolean DEFAULT false NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risk_score" numeric(5, 4) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewer_id" text,
	"reviewed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "shopify_product_refs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"product_draft_id" text NOT NULL,
	"connected_store_id" text,
	"shopify_product_id" text NOT NULL,
	"shopify_handle" text NOT NULL,
	"shopify_status" text DEFAULT 'draft' NOT NULL,
	"shopify_published_at" timestamp with time zone,
	"shopify_collection_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shopify_variant_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "storefront_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"page_type" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "storefront_theme_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"theme_key" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"workspace_id" text,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'trialing' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"provider_subscription_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_macros" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"body" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trend_cluster_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"cluster_id" text NOT NULL,
	"signal_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"signal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aesthetic_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seasonality" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_customer" text NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"approved_for_generation" boolean DEFAULT false NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "trend_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_id" text NOT NULL,
	"source_url" text,
	"captured_at" timestamp with time zone NOT NULL,
	"keyword" text NOT NULL,
	"related_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text NOT NULL,
	"region" text NOT NULL,
	"season" text,
	"confidence" numeric(5, 4) NOT NULL,
	"allowed_use" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"cluster_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "trend_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"allowed_use" text NOT NULL,
	"requires_manual_import" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source_policy_url" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip_address" text,
	"user_agent" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_brand_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"brand_name" text NOT NULL,
	"voice" text NOT NULL,
	"target_customer" text NOT NULL,
	"banned_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"color_palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"product_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workspace_feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"flag_key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason" text,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "workspace_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metric_key" text NOT NULL,
	"metric_value" numeric(18, 4) NOT NULL,
	"dimension_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_provider_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_type" text NOT NULL,
	"provider_name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'disabled' NOT NULL,
	"secret_ref" text,
	"last_health_check_at" timestamp with time zone,
	"last_health_check_status" text,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workspace_subscription_status" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subscription_id" text,
	"plan_id" text,
	"status" text DEFAULT 'trialing' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"renews_at" timestamp with time zone,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"usage_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'count' NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"ref_type" text,
	"ref_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"default_brand_name" text DEFAULT 'Salty Cowhide Co.' NOT NULL,
	"primary_domain" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_employee_audit_events" ADD CONSTRAINT "ai_employee_audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_audit_events" ADD CONSTRAINT "ai_employee_audit_events_employee_id_ai_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_audit_events" ADD CONSTRAINT "ai_employee_audit_events_run_id_ai_employee_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_employee_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_audit_events" ADD CONSTRAINT "ai_employee_audit_events_task_id_ai_employee_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."ai_employee_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_outputs" ADD CONSTRAINT "ai_employee_outputs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_outputs" ADD CONSTRAINT "ai_employee_outputs_run_id_ai_employee_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_employee_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_outputs" ADD CONSTRAINT "ai_employee_outputs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_permissions" ADD CONSTRAINT "ai_employee_permissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_permissions" ADD CONSTRAINT "ai_employee_permissions_employee_id_ai_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_permissions" ADD CONSTRAINT "ai_employee_permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_runs" ADD CONSTRAINT "ai_employee_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_runs" ADD CONSTRAINT "ai_employee_runs_employee_id_ai_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_runs" ADD CONSTRAINT "ai_employee_runs_task_id_ai_employee_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."ai_employee_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_runs" ADD CONSTRAINT "ai_employee_runs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_tasks" ADD CONSTRAINT "ai_employee_tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_tasks" ADD CONSTRAINT "ai_employee_tasks_employee_id_ai_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_tasks" ADD CONSTRAINT "ai_employee_tasks_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employees" ADD CONSTRAINT "ai_employees_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employees" ADD CONSTRAINT "ai_employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employees" ADD CONSTRAINT "ai_employees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employees" ADD CONSTRAINT "ai_employees_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_stores" ADD CONSTRAINT "connected_stores_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_stores" ADD CONSTRAINT "connected_stores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_stores" ADD CONSTRAINT "connected_stores_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_stores" ADD CONSTRAINT "connected_stores_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_stores" ADD CONSTRAINT "connected_stores_connection_id_workspace_provider_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."workspace_provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_drafts" ADD CONSTRAINT "customer_support_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_drafts" ADD CONSTRAINT "customer_support_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_drafts" ADD CONSTRAINT "customer_support_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_drafts" ADD CONSTRAINT "customer_support_drafts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_drafts" ADD CONSTRAINT "customer_support_drafts_macro_id_support_macros_id_fk" FOREIGN KEY ("macro_id") REFERENCES "public"."support_macros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_drafts" ADD CONSTRAINT "customer_support_drafts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_brief_id_design_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."design_briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_assets" ADD CONSTRAINT "design_assets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_briefs" ADD CONSTRAINT "design_briefs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_briefs" ADD CONSTRAINT "design_briefs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_briefs" ADD CONSTRAINT "design_briefs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_briefs" ADD CONSTRAINT "design_briefs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_briefs" ADD CONSTRAINT "design_briefs_phrase_id_phrase_candidates_id_fk" FOREIGN KEY ("phrase_id") REFERENCES "public"."phrase_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_briefs" ADD CONSTRAINT "design_briefs_cluster_id_trend_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."trend_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_briefs" ADD CONSTRAINT "design_briefs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_calendars" ADD CONSTRAINT "drop_calendars_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_calendars" ADD CONSTRAINT "drop_calendars_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_calendars" ADD CONSTRAINT "drop_calendars_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_calendars" ADD CONSTRAINT "drop_calendars_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_calendars" ADD CONSTRAINT "drop_calendars_collection_plan_id_product_collection_plans_id_fk" FOREIGN KEY ("collection_plan_id") REFERENCES "public"."product_collection_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_limits" ADD CONSTRAINT "feature_limits_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_shopify_product_ref_id_shopify_product_refs_id_fk" FOREIGN KEY ("shopify_product_ref_id") REFERENCES "public"."shopify_product_refs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_events" ADD CONSTRAINT "fulfillment_events_printify_product_ref_id_printify_product_refs_id_fk" FOREIGN KEY ("printify_product_ref_id") REFERENCES "public"."printify_product_refs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_brief_id_design_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."design_briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_product_draft_id_product_drafts_id_fk" FOREIGN KEY ("product_draft_id") REFERENCES "public"."product_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_assets" ADD CONSTRAINT "marketing_assets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_assets" ADD CONSTRAINT "mockup_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_assets" ADD CONSTRAINT "mockup_assets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_assets" ADD CONSTRAINT "mockup_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_assets" ADD CONSTRAINT "mockup_assets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_assets" ADD CONSTRAINT "mockup_assets_asset_id_design_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."design_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_assets" ADD CONSTRAINT "mockup_assets_template_id_mockup_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."mockup_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_assets" ADD CONSTRAINT "mockup_assets_product_draft_id_product_drafts_id_fk" FOREIGN KEY ("product_draft_id") REFERENCES "public"."product_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_templates" ADD CONSTRAINT "mockup_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_templates" ADD CONSTRAINT "mockup_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_templates" ADD CONSTRAINT "mockup_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mockup_templates" ADD CONSTRAINT "mockup_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phrase_candidates" ADD CONSTRAINT "phrase_candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phrase_candidates" ADD CONSTRAINT "phrase_candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phrase_candidates" ADD CONSTRAINT "phrase_candidates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phrase_candidates" ADD CONSTRAINT "phrase_candidates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phrase_candidates" ADD CONSTRAINT "phrase_candidates_cluster_id_trend_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."trend_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phrase_candidates" ADD CONSTRAINT "phrase_candidates_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_margin_checks" ADD CONSTRAINT "price_margin_checks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_margin_checks" ADD CONSTRAINT "price_margin_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_margin_checks" ADD CONSTRAINT "price_margin_checks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_margin_checks" ADD CONSTRAINT "price_margin_checks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_margin_checks" ADD CONSTRAINT "price_margin_checks_product_draft_id_product_drafts_id_fk" FOREIGN KEY ("product_draft_id") REFERENCES "public"."product_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_margin_checks" ADD CONSTRAINT "price_margin_checks_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_file_qa" ADD CONSTRAINT "print_file_qa_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_file_qa" ADD CONSTRAINT "print_file_qa_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_file_qa" ADD CONSTRAINT "print_file_qa_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_file_qa" ADD CONSTRAINT "print_file_qa_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_file_qa" ADD CONSTRAINT "print_file_qa_asset_id_design_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."design_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_file_qa" ADD CONSTRAINT "print_file_qa_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD CONSTRAINT "printify_product_refs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD CONSTRAINT "printify_product_refs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD CONSTRAINT "printify_product_refs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD CONSTRAINT "printify_product_refs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD CONSTRAINT "printify_product_refs_product_draft_id_product_drafts_id_fk" FOREIGN KEY ("product_draft_id") REFERENCES "public"."product_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD CONSTRAINT "printify_product_refs_connected_store_id_connected_stores_id_fk" FOREIGN KEY ("connected_store_id") REFERENCES "public"."connected_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collection_plans" ADD CONSTRAINT "product_collection_plans_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collection_plans" ADD CONSTRAINT "product_collection_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collection_plans" ADD CONSTRAINT "product_collection_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collection_plans" ADD CONSTRAINT "product_collection_plans_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collection_plans" ADD CONSTRAINT "product_collection_plans_brand_profile_id_brand_profiles_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_brief_id_design_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."design_briefs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_asset_id_design_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."design_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_drafts" ADD CONSTRAINT "product_drafts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_draft_id_product_drafts_id_fk" FOREIGN KEY ("product_draft_id") REFERENCES "public"."product_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connection_status" ADD CONSTRAINT "provider_connection_status_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connection_status" ADD CONSTRAINT "provider_connection_status_provider_connection_id_workspace_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."workspace_provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_reviews" ADD CONSTRAINT "publish_reviews_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_reviews" ADD CONSTRAINT "publish_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_reviews" ADD CONSTRAINT "publish_reviews_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_reviews" ADD CONSTRAINT "publish_reviews_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_reviews" ADD CONSTRAINT "publish_reviews_product_draft_id_product_drafts_id_fk" FOREIGN KEY ("product_draft_id") REFERENCES "public"."product_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_reviews" ADD CONSTRAINT "publish_reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_reviews" ADD CONSTRAINT "risk_reviews_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_reviews" ADD CONSTRAINT "risk_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_reviews" ADD CONSTRAINT "risk_reviews_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_reviews" ADD CONSTRAINT "risk_reviews_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_reviews" ADD CONSTRAINT "risk_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD CONSTRAINT "shopify_product_refs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD CONSTRAINT "shopify_product_refs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD CONSTRAINT "shopify_product_refs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD CONSTRAINT "shopify_product_refs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD CONSTRAINT "shopify_product_refs_product_draft_id_product_drafts_id_fk" FOREIGN KEY ("product_draft_id") REFERENCES "public"."product_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD CONSTRAINT "shopify_product_refs_connected_store_id_connected_stores_id_fk" FOREIGN KEY ("connected_store_id") REFERENCES "public"."connected_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_pages" ADD CONSTRAINT "storefront_pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_pages" ADD CONSTRAINT "storefront_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_pages" ADD CONSTRAINT "storefront_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_pages" ADD CONSTRAINT "storefront_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_theme_settings" ADD CONSTRAINT "storefront_theme_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_theme_settings" ADD CONSTRAINT "storefront_theme_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_theme_settings" ADD CONSTRAINT "storefront_theme_settings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_theme_settings" ADD CONSTRAINT "storefront_theme_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_cluster_signals" ADD CONSTRAINT "trend_cluster_signals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_cluster_signals" ADD CONSTRAINT "trend_cluster_signals_cluster_id_trend_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."trend_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_cluster_signals" ADD CONSTRAINT "trend_cluster_signals_signal_id_trend_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."trend_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD CONSTRAINT "trend_clusters_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD CONSTRAINT "trend_clusters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD CONSTRAINT "trend_clusters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD CONSTRAINT "trend_clusters_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD CONSTRAINT "trend_clusters_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_source_id_trend_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."trend_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_cluster_id_trend_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."trend_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD CONSTRAINT "trend_sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD CONSTRAINT "trend_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD CONSTRAINT "trend_sources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD CONSTRAINT "trend_sources_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_audit_events" ADD CONSTRAINT "workspace_audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_brand_profiles" ADD CONSTRAINT "workspace_brand_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_brand_profiles" ADD CONSTRAINT "workspace_brand_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_brand_profiles" ADD CONSTRAINT "workspace_brand_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_brand_profiles" ADD CONSTRAINT "workspace_brand_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_feature_flags" ADD CONSTRAINT "workspace_feature_flags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_feature_flags" ADD CONSTRAINT "workspace_feature_flags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_feature_flags" ADD CONSTRAINT "workspace_feature_flags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_metrics" ADD CONSTRAINT "workspace_metrics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_provider_connections" ADD CONSTRAINT "workspace_provider_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_provider_connections" ADD CONSTRAINT "workspace_provider_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_provider_connections" ADD CONSTRAINT "workspace_provider_connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_provider_connections" ADD CONSTRAINT "workspace_provider_connections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_subscription_status" ADD CONSTRAINT "workspace_subscription_status_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_subscription_status" ADD CONSTRAINT "workspace_subscription_status_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_subscription_status" ADD CONSTRAINT "workspace_subscription_status_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_usage_events" ADD CONSTRAINT "workspace_usage_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_employee_audit_events_workspace_idx" ON "ai_employee_audit_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ai_employee_audit_events_run_idx" ON "ai_employee_audit_events" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ai_employee_outputs_run_idx" ON "ai_employee_outputs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ai_employee_outputs_workspace_status_idx" ON "ai_employee_outputs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_employee_permissions_unique" ON "ai_employee_permissions" USING btree ("employee_id","permission_key");--> statement-breakpoint
CREATE INDEX "ai_employee_runs_workspace_status_idx" ON "ai_employee_runs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_employee_runs_input_idx" ON "ai_employee_runs" USING btree ("input_ref_type","input_ref_id");--> statement-breakpoint
CREATE INDEX "ai_employee_tasks_workspace_status_idx" ON "ai_employee_tasks" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_employee_tasks_employee_idx" ON "ai_employee_tasks" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "ai_employees_workspace_type_idx" ON "ai_employees" USING btree ("workspace_id","employee_type");--> statement-breakpoint
CREATE INDEX "ai_employees_status_idx" ON "ai_employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_events_workspace_entity_idx" ON "audit_events" USING btree ("workspace_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "billing_events_org_idx" ON "billing_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_events_workspace_idx" ON "billing_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "billing_events_event_idx" ON "billing_events" USING btree ("event_type","status");--> statement-breakpoint
CREATE INDEX "brand_profiles_workspace_idx" ON "brand_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brand_profiles_name_idx" ON "brand_profiles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "connected_stores_workspace_idx" ON "connected_stores" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "connected_stores_provider_idx" ON "connected_stores" USING btree ("provider_type");--> statement-breakpoint
CREATE INDEX "customer_support_drafts_workspace_status_idx" ON "customer_support_drafts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "customer_support_drafts_order_idx" ON "customer_support_drafts" USING btree ("order_ref");--> statement-breakpoint
CREATE INDEX "design_assets_workspace_qa_idx" ON "design_assets" USING btree ("workspace_id","qa_status");--> statement-breakpoint
CREATE INDEX "design_assets_brief_idx" ON "design_assets" USING btree ("brief_id");--> statement-breakpoint
CREATE INDEX "design_briefs_workspace_status_idx" ON "design_briefs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "design_briefs_cluster_idx" ON "design_briefs" USING btree ("cluster_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drop_calendars_slug_unique" ON "drop_calendars" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "drop_calendars_launch_idx" ON "drop_calendars" USING btree ("launch_at");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_limits_plan_feature_unique" ON "feature_limits" USING btree ("plan_id","feature_key");--> statement-breakpoint
CREATE INDEX "fulfillment_events_workspace_status_idx" ON "fulfillment_events" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "fulfillment_events_shopify_order_idx" ON "fulfillment_events" USING btree ("shopify_order_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_workspace_status_idx" ON "generation_jobs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "generation_jobs_brief_idx" ON "generation_jobs" USING btree ("brief_id");--> statement-breakpoint
CREATE INDEX "marketing_assets_workspace_status_idx" ON "marketing_assets" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "marketing_assets_draft_idx" ON "marketing_assets" USING btree ("product_draft_id");--> statement-breakpoint
CREATE INDEX "marketing_campaigns_workspace_status_idx" ON "marketing_campaigns" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "mockup_assets_draft_idx" ON "mockup_assets" USING btree ("product_draft_id");--> statement-breakpoint
CREATE INDEX "mockup_assets_workspace_status_idx" ON "mockup_assets" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "mockup_templates_workspace_product_idx" ON "mockup_templates" USING btree ("workspace_id","product_type");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_org_user_unique" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_members_org_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_owner_idx" ON "organizations" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "phrase_candidates_workspace_status_idx" ON "phrase_candidates" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "phrase_candidates_cluster_idx" ON "phrase_candidates" USING btree ("cluster_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_code_unique" ON "plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "price_margin_checks_draft_idx" ON "price_margin_checks" USING btree ("product_draft_id");--> statement-breakpoint
CREATE INDEX "price_margin_checks_workspace_status_idx" ON "price_margin_checks" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "print_file_qa_asset_idx" ON "print_file_qa" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "print_file_qa_workspace_status_idx" ON "print_file_qa" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "printify_product_refs_draft_idx" ON "printify_product_refs" USING btree ("product_draft_id");--> statement-breakpoint
CREATE UNIQUE INDEX "printify_product_refs_product_unique" ON "printify_product_refs" USING btree ("workspace_id","printify_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_collection_plans_slug_unique" ON "product_collection_plans" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "product_collection_plans_status_idx" ON "product_collection_plans" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "product_drafts_workspace_status_idx" ON "product_drafts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "product_drafts_approval_idx" ON "product_drafts" USING btree ("approval_status");--> statement-breakpoint
CREATE UNIQUE INDEX "product_drafts_public_handle_unique" ON "product_drafts" USING btree ("workspace_id","public_handle");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_unique" ON "product_variants" USING btree ("workspace_id","sku");--> statement-breakpoint
CREATE INDEX "product_variants_draft_idx" ON "product_variants" USING btree ("product_draft_id");--> statement-breakpoint
CREATE INDEX "provider_connection_status_connection_idx" ON "provider_connection_status" USING btree ("provider_connection_id");--> statement-breakpoint
CREATE INDEX "provider_connection_status_workspace_idx" ON "provider_connection_status" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "publish_reviews_draft_unique" ON "publish_reviews" USING btree ("product_draft_id");--> statement-breakpoint
CREATE INDEX "publish_reviews_workspace_status_idx" ON "publish_reviews" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "risk_reviews_entity_idx" ON "risk_reviews" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "risk_reviews_workspace_status_idx" ON "risk_reviews" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "shopify_product_refs_draft_idx" ON "shopify_product_refs" USING btree ("product_draft_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shopify_product_refs_product_unique" ON "shopify_product_refs" USING btree ("workspace_id","shopify_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_pages_slug_unique" ON "storefront_pages" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "storefront_pages_workspace_status_idx" ON "storefront_pages" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_theme_settings_unique" ON "storefront_theme_settings" USING btree ("workspace_id","theme_key");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_workspace_idx" ON "subscriptions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "subscriptions_provider_idx" ON "subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "support_macros_workspace_category_idx" ON "support_macros" USING btree ("workspace_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "trend_cluster_signals_unique" ON "trend_cluster_signals" USING btree ("cluster_id","signal_id");--> statement-breakpoint
CREATE INDEX "trend_cluster_signals_workspace_idx" ON "trend_cluster_signals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "trend_clusters_workspace_status_idx" ON "trend_clusters" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "trend_clusters_name_idx" ON "trend_clusters" USING btree ("name");--> statement-breakpoint
CREATE INDEX "trend_signals_workspace_status_idx" ON "trend_signals" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "trend_signals_source_idx" ON "trend_signals" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "trend_signals_cluster_idx" ON "trend_signals" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "trend_signals_keyword_idx" ON "trend_signals" USING btree ("keyword");--> statement-breakpoint
CREATE INDEX "trend_sources_workspace_type_idx" ON "trend_sources" USING btree ("workspace_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_audit_events_workspace_entity_idx" ON "workspace_audit_events" USING btree ("workspace_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "workspace_audit_events_actor_idx" ON "workspace_audit_events" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "workspace_brand_profiles_workspace_idx" ON "workspace_brand_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_brand_profiles_status_idx" ON "workspace_brand_profiles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_feature_flags_unique" ON "workspace_feature_flags" USING btree ("workspace_id","flag_key");--> statement-breakpoint
CREATE INDEX "workspace_feature_flags_workspace_idx" ON "workspace_feature_flags" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_metrics_metric_idx" ON "workspace_metrics" USING btree ("workspace_id","metric_key","measured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_provider_connections_provider_unique" ON "workspace_provider_connections" USING btree ("workspace_id","provider_type","provider_name");--> statement-breakpoint
CREATE INDEX "workspace_provider_connections_workspace_idx" ON "workspace_provider_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_provider_connections_status_idx" ON "workspace_provider_connections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_subscription_status_workspace_unique" ON "workspace_subscription_status" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_usage_events_workspace_type_idx" ON "workspace_usage_events" USING btree ("workspace_id","event_type");--> statement-breakpoint
CREATE INDEX "workspace_usage_events_occurred_idx" ON "workspace_usage_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_org_slug_unique" ON "workspaces" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "workspaces_org_idx" ON "workspaces" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "workspaces_status_idx" ON "workspaces" USING btree ("status");