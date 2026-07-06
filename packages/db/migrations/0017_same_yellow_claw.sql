CREATE TABLE "margin_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"price" numeric(12, 2),
	"cost_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"margin_dollars" numeric(12, 2),
	"margin_pct" numeric(8, 4),
	"breakeven_cpa" numeric(12, 2),
	"floor_breach" boolean,
	"missing_cost_data" boolean DEFAULT true NOT NULL,
	"paid_readiness" text DEFAULT 'unknown' NOT NULL,
	"safe_offers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unsafe_offer_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendation_text" text DEFAULT 'Margin cannot be fully determined until required costs are present.' NOT NULL,
	"reconciliation_status" text DEFAULT 'not_applicable' NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"formula_version" text DEFAULT 'margin_economics_v1' NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_readiness_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"readiness_score" integer NOT NULL,
	"verdict" text NOT NULL,
	"blocking_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checklist_version" text DEFAULT 'product_readiness_v1' NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"llm_explanation" text,
	"owner_action_needed" text DEFAULT 'review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"title_draft" text NOT NULL,
	"meta_description_draft" text NOT NULL,
	"h1_suggestion" text NOT NULL,
	"h2_suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faq_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_readable_summary" text NOT NULL,
	"comparison_bullets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schema_recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_alt_text_suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pdp_clarity_fixes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"internal_link_suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"compliance_checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"keyword_data_source" text DEFAULT 'directional' NOT NULL,
	"policy_review_id" text,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendation_version" text DEFAULT 'seo_geo_pdp_v1' NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "source_text_hash" text;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "ruleset_version" text DEFAULT 'policy_claims_ip_v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "flagged_terms" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "unsupported_claims" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "personal_attribute_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "ip_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "risk_level" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "llm_context_note" text;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "suggested_rewrite" text;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD COLUMN "rewrite_recheck_status" text DEFAULT 'not_needed' NOT NULL;--> statement-breakpoint
ALTER TABLE "margin_analysis" ADD CONSTRAINT "margin_analysis_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_analysis" ADD CONSTRAINT "margin_analysis_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_analysis" ADD CONSTRAINT "margin_analysis_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_analysis" ADD CONSTRAINT "margin_analysis_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_readiness_checks" ADD CONSTRAINT "product_readiness_checks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_readiness_checks" ADD CONSTRAINT "product_readiness_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_readiness_checks" ADD CONSTRAINT "product_readiness_checks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_readiness_checks" ADD CONSTRAINT "product_readiness_checks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_recommendations" ADD CONSTRAINT "seo_recommendations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_recommendations" ADD CONSTRAINT "seo_recommendations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_recommendations" ADD CONSTRAINT "seo_recommendations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_recommendations" ADD CONSTRAINT "seo_recommendations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_recommendations" ADD CONSTRAINT "seo_recommendations_policy_review_id_policy_review_results_id_fk" FOREIGN KEY ("policy_review_id") REFERENCES "public"."policy_review_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "margin_analysis_workspace_entity_idx" ON "margin_analysis" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "margin_analysis_workspace_paid_readiness_idx" ON "margin_analysis" USING btree ("workspace_id","paid_readiness");--> statement-breakpoint
CREATE INDEX "product_readiness_checks_workspace_entity_idx" ON "product_readiness_checks" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "product_readiness_checks_workspace_verdict_idx" ON "product_readiness_checks" USING btree ("workspace_id","verdict");--> statement-breakpoint
CREATE INDEX "seo_recommendations_workspace_entity_idx" ON "seo_recommendations" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "seo_recommendations_workspace_review_idx" ON "seo_recommendations" USING btree ("workspace_id","review_status");
