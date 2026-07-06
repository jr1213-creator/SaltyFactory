CREATE TABLE "ad_angles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"angle_type" text NOT NULL,
	"angle_title" text NOT NULL,
	"hook" text NOT NULL,
	"promise" text NOT NULL,
	"proof_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trend_evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_copy_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"ad_angle_id" text,
	"channel" text NOT NULL,
	"headline" text NOT NULL,
	"primary_text" text NOT NULL,
	"description" text,
	"cta" text,
	"platform_constraints" jsonb,
	"policy_review_result_id" text,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audience_hypotheses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"channel" text NOT NULL,
	"segment_name" text NOT NULL,
	"description" text NOT NULL,
	"rationale" text NOT NULL,
	"targeting_parameters" jsonb,
	"exclusion_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sensitive_targeting_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_voice_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"brand_name" text NOT NULL,
	"tone_descriptors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vocabulary_preferences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"banned_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approved_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"example_approved_copy" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"claim_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_blocklist" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"recommended_daily_budget" numeric(12, 2) DEFAULT '0' NOT NULL,
	"recommended_total_test_budget" numeric(12, 2) DEFAULT '0' NOT NULL,
	"break_even_cpa" numeric(12, 2),
	"target_cpa" numeric(12, 2),
	"calculation_basis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_approval_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"requested_action" text NOT NULL,
	"risk_summary" jsonb,
	"owner_decision" text DEFAULT 'pending' NOT NULL,
	"reviewer" text,
	"decided_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "campaign_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"media_plan_draft_id" text,
	"platform" text NOT NULL,
	"campaign_name" text NOT NULL,
	"objective" text NOT NULL,
	"platform_object_structure" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"platform_object_ids" jsonb,
	"write_mode" text DEFAULT 'live_write_blocked' NOT NULL,
	"utm_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risk_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approval_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"channel" text NOT NULL,
	"priority_score" integer DEFAULT 0 NOT NULL,
	"rationale" text NOT NULL,
	"required_assets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cash_cost_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"owner_time_estimate_minutes" integer,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_briefs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"ad_angle_id" text,
	"creative_type" text NOT NULL,
	"prompt_or_brief" text NOT NULL,
	"text_overlay" text,
	"aspect_ratio" text,
	"asset_requirements" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_motifs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"not_copying_warning" text DEFAULT 'Do not copy competitor ads, listings, captions, or layouts.' NOT NULL,
	"policy_review_result_id" text,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_page_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"recommendation_type" text NOT NULL,
	"before_text" text,
	"after_text" text,
	"supporting_metrics" jsonb,
	"expected_impact" text NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifecycle_campaign_flows" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text,
	"flow_trigger" text NOT NULL,
	"sequence_step" integer DEFAULT 1 NOT NULL,
	"subject_line" text,
	"preview_text" text,
	"body_markdown" text,
	"sms_variant_text" text,
	"segment_notes" text,
	"consent_required" boolean DEFAULT true NOT NULL,
	"send_status" text DEFAULT 'draft_only' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_launch_plans" (
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
	"brand_voice_profile_id" text NOT NULL,
	"readiness_id" text,
	"launch_name" text NOT NULL,
	"campaign_type" text DEFAULT 'organic' NOT NULL,
	"spend_type" text DEFAULT 'no_spend' NOT NULL,
	"estimated_cash_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"owner_time_estimate_minutes" integer,
	"requires_ad_budget" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"summary" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_source_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"failure_code" text,
	"records_read" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketing_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_key" text NOT NULL,
	"display_name" text NOT NULL,
	"source_type" text NOT NULL,
	"credential_status" text DEFAULT 'not_configured' NOT NULL,
	"access_mode" text DEFAULT 'read_only' NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"is_trusted" boolean DEFAULT false NOT NULL,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"access_notes" text
);
--> statement-breakpoint
CREATE TABLE "media_plan_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"objective" text NOT NULL,
	"campaign_type" text NOT NULL,
	"spend_type" text NOT NULL,
	"channel_allocations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_budget_recommended" numeric(12, 2) DEFAULT '0' NOT NULL,
	"daily_budget_cap" numeric(12, 2),
	"break_even_cpa" numeric(12, 2),
	"test_duration_days" integer,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_hypotheses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"offer_type" text NOT NULL,
	"offer_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"margin_calculation" jsonb,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organic_content_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"content_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"estimated_cash_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"owner_time_estimate_minutes" integer,
	"publish_approval_required" boolean DEFAULT true NOT NULL,
	"send_approval_required" boolean DEFAULT true NOT NULL,
	"outreach_approval_required" boolean DEFAULT true NOT NULL,
	"policy_review_result_id" text,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_review_results" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"platform" text,
	"verdict" text DEFAULT 'pass' NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"policy_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fix_suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owner_override" jsonb,
	"blocked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positioning_statements" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"launch_plan_id" text NOT NULL,
	"primary_promise" text NOT NULL,
	"customer_moment" text NOT NULL,
	"differentiators" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"objections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_concept_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_id" text NOT NULL,
	"cluster_id" text NOT NULL,
	"trend_score_id" text,
	"title" text NOT NULL,
	"customer_segment" text NOT NULL,
	"product_category" text NOT NULL,
	"suggested_product_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"personalization_potential" text NOT NULL,
	"phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visual_motifs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"print_style" text NOT NULL,
	"recommended_blank_or_base_product" text,
	"margin_hypothesis" text,
	"source_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reason_it_may_sell" text NOT NULL,
	"risk_notes" text DEFAULT '' NOT NULL,
	"owner_action_needed" text DEFAULT 'watch_longer' NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL,
	"created_by_kind" text DEFAULT 'ollama_agent' NOT NULL,
	"owner_notes" text
);
--> statement-breakpoint
CREATE TABLE "product_marketing_readiness" (
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
	"title_present" boolean DEFAULT false NOT NULL,
	"description_present" boolean DEFAULT false NOT NULL,
	"price_present" boolean DEFAULT false NOT NULL,
	"mockup_present" boolean DEFAULT false NOT NULL,
	"asset_status" text DEFAULT 'unknown' NOT NULL,
	"variant_status" text DEFAULT 'unknown' NOT NULL,
	"cost_present" boolean DEFAULT false NOT NULL,
	"estimated_margin" numeric(12, 2),
	"shipping_assumption_status" text DEFAULT 'unknown' NOT NULL,
	"pdp_url" text,
	"policy_status" text DEFAULT 'pending_review' NOT NULL,
	"ip_risk_status" text DEFAULT 'unknown' NOT NULL,
	"marketability_score" integer DEFAULT 0 NOT NULL,
	"blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_analysis_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_id" text NOT NULL,
	"agent_run_id" text,
	"source_signal_count" integer DEFAULT 0 NOT NULL,
	"cluster_count" integer DEFAULT 0 NOT NULL,
	"concept_candidate_count" integer DEFAULT 0 NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_id" text NOT NULL,
	"cluster_id" text NOT NULL,
	"total_score" numeric(6, 2) DEFAULT '0' NOT NULL,
	"confidence_score" numeric(6, 2) DEFAULT '0' NOT NULL,
	"component_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_action" text DEFAULT 'watch_longer' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "profile_id" text;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "member_signal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "source_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "keyword_terms" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "motif_terms" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "citation_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "signal_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "cross_source_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "first_observed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "last_observed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD COLUMN "created_by_kind" text;--> statement-breakpoint
ALTER TABLE "ad_angles" ADD CONSTRAINT "ad_angles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_angles" ADD CONSTRAINT "ad_angles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_angles" ADD CONSTRAINT "ad_angles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_angles" ADD CONSTRAINT "ad_angles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_angles" ADD CONSTRAINT "ad_angles_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy_variants" ADD CONSTRAINT "ad_copy_variants_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy_variants" ADD CONSTRAINT "ad_copy_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy_variants" ADD CONSTRAINT "ad_copy_variants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy_variants" ADD CONSTRAINT "ad_copy_variants_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy_variants" ADD CONSTRAINT "ad_copy_variants_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy_variants" ADD CONSTRAINT "ad_copy_variants_ad_angle_id_ad_angles_id_fk" FOREIGN KEY ("ad_angle_id") REFERENCES "public"."ad_angles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_copy_variants" ADD CONSTRAINT "ad_copy_variants_policy_review_result_id_policy_review_results_id_fk" FOREIGN KEY ("policy_review_result_id") REFERENCES "public"."policy_review_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_hypotheses" ADD CONSTRAINT "audience_hypotheses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_hypotheses" ADD CONSTRAINT "audience_hypotheses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_hypotheses" ADD CONSTRAINT "audience_hypotheses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_hypotheses" ADD CONSTRAINT "audience_hypotheses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_hypotheses" ADD CONSTRAINT "audience_hypotheses_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_profiles" ADD CONSTRAINT "brand_voice_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_profiles" ADD CONSTRAINT "brand_voice_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_profiles" ADD CONSTRAINT "brand_voice_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voice_profiles" ADD CONSTRAINT "brand_voice_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_recommendations" ADD CONSTRAINT "budget_recommendations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_recommendations" ADD CONSTRAINT "budget_recommendations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_recommendations" ADD CONSTRAINT "budget_recommendations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_recommendations" ADD CONSTRAINT "budget_recommendations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_recommendations" ADD CONSTRAINT "budget_recommendations_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_approval_requests" ADD CONSTRAINT "campaign_approval_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_approval_requests" ADD CONSTRAINT "campaign_approval_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_approval_requests" ADD CONSTRAINT "campaign_approval_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_approval_requests" ADD CONSTRAINT "campaign_approval_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_approval_requests" ADD CONSTRAINT "campaign_approval_requests_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_drafts" ADD CONSTRAINT "campaign_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_drafts" ADD CONSTRAINT "campaign_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_drafts" ADD CONSTRAINT "campaign_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_drafts" ADD CONSTRAINT "campaign_drafts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_drafts" ADD CONSTRAINT "campaign_drafts_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_drafts" ADD CONSTRAINT "campaign_drafts_media_plan_draft_id_media_plan_drafts_id_fk" FOREIGN KEY ("media_plan_draft_id") REFERENCES "public"."media_plan_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_recommendations" ADD CONSTRAINT "channel_recommendations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_recommendations" ADD CONSTRAINT "channel_recommendations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_recommendations" ADD CONSTRAINT "channel_recommendations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_recommendations" ADD CONSTRAINT "channel_recommendations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_recommendations" ADD CONSTRAINT "channel_recommendations_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_briefs" ADD CONSTRAINT "creative_briefs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_briefs" ADD CONSTRAINT "creative_briefs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_briefs" ADD CONSTRAINT "creative_briefs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_briefs" ADD CONSTRAINT "creative_briefs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_briefs" ADD CONSTRAINT "creative_briefs_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_briefs" ADD CONSTRAINT "creative_briefs_ad_angle_id_ad_angles_id_fk" FOREIGN KEY ("ad_angle_id") REFERENCES "public"."ad_angles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_briefs" ADD CONSTRAINT "creative_briefs_policy_review_result_id_policy_review_results_id_fk" FOREIGN KEY ("policy_review_result_id") REFERENCES "public"."policy_review_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_recommendations" ADD CONSTRAINT "landing_page_recommendations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_recommendations" ADD CONSTRAINT "landing_page_recommendations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_recommendations" ADD CONSTRAINT "landing_page_recommendations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_recommendations" ADD CONSTRAINT "landing_page_recommendations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_recommendations" ADD CONSTRAINT "landing_page_recommendations_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_campaign_flows" ADD CONSTRAINT "lifecycle_campaign_flows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_campaign_flows" ADD CONSTRAINT "lifecycle_campaign_flows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_campaign_flows" ADD CONSTRAINT "lifecycle_campaign_flows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_campaign_flows" ADD CONSTRAINT "lifecycle_campaign_flows_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_campaign_flows" ADD CONSTRAINT "lifecycle_campaign_flows_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_launch_plans" ADD CONSTRAINT "marketing_launch_plans_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_launch_plans" ADD CONSTRAINT "marketing_launch_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_launch_plans" ADD CONSTRAINT "marketing_launch_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_launch_plans" ADD CONSTRAINT "marketing_launch_plans_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_launch_plans" ADD CONSTRAINT "marketing_launch_plans_brand_voice_profile_id_brand_voice_profiles_id_fk" FOREIGN KEY ("brand_voice_profile_id") REFERENCES "public"."brand_voice_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_launch_plans" ADD CONSTRAINT "marketing_launch_plans_readiness_id_product_marketing_readiness_id_fk" FOREIGN KEY ("readiness_id") REFERENCES "public"."product_marketing_readiness"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_source_runs" ADD CONSTRAINT "marketing_source_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_source_runs" ADD CONSTRAINT "marketing_source_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_source_runs" ADD CONSTRAINT "marketing_source_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_source_runs" ADD CONSTRAINT "marketing_source_runs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_sources" ADD CONSTRAINT "marketing_sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_sources" ADD CONSTRAINT "marketing_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_sources" ADD CONSTRAINT "marketing_sources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_sources" ADD CONSTRAINT "marketing_sources_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_plan_drafts" ADD CONSTRAINT "media_plan_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_plan_drafts" ADD CONSTRAINT "media_plan_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_plan_drafts" ADD CONSTRAINT "media_plan_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_plan_drafts" ADD CONSTRAINT "media_plan_drafts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_plan_drafts" ADD CONSTRAINT "media_plan_drafts_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_hypotheses" ADD CONSTRAINT "offer_hypotheses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_hypotheses" ADD CONSTRAINT "offer_hypotheses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_hypotheses" ADD CONSTRAINT "offer_hypotheses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_hypotheses" ADD CONSTRAINT "offer_hypotheses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_hypotheses" ADD CONSTRAINT "offer_hypotheses_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_content_drafts" ADD CONSTRAINT "organic_content_drafts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_content_drafts" ADD CONSTRAINT "organic_content_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_content_drafts" ADD CONSTRAINT "organic_content_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_content_drafts" ADD CONSTRAINT "organic_content_drafts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_content_drafts" ADD CONSTRAINT "organic_content_drafts_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organic_content_drafts" ADD CONSTRAINT "organic_content_drafts_policy_review_result_id_policy_review_results_id_fk" FOREIGN KEY ("policy_review_result_id") REFERENCES "public"."policy_review_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD CONSTRAINT "policy_review_results_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD CONSTRAINT "policy_review_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD CONSTRAINT "policy_review_results_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_review_results" ADD CONSTRAINT "policy_review_results_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positioning_statements" ADD CONSTRAINT "positioning_statements_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positioning_statements" ADD CONSTRAINT "positioning_statements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positioning_statements" ADD CONSTRAINT "positioning_statements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positioning_statements" ADD CONSTRAINT "positioning_statements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positioning_statements" ADD CONSTRAINT "positioning_statements_launch_plan_id_marketing_launch_plans_id_fk" FOREIGN KEY ("launch_plan_id") REFERENCES "public"."marketing_launch_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_concept_candidates" ADD CONSTRAINT "product_concept_candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_concept_candidates" ADD CONSTRAINT "product_concept_candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_concept_candidates" ADD CONSTRAINT "product_concept_candidates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_concept_candidates" ADD CONSTRAINT "product_concept_candidates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_concept_candidates" ADD CONSTRAINT "product_concept_candidates_profile_id_trend_watch_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."trend_watch_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_concept_candidates" ADD CONSTRAINT "product_concept_candidates_cluster_id_trend_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."trend_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_concept_candidates" ADD CONSTRAINT "product_concept_candidates_trend_score_id_trend_scores_id_fk" FOREIGN KEY ("trend_score_id") REFERENCES "public"."trend_scores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_marketing_readiness" ADD CONSTRAINT "product_marketing_readiness_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_marketing_readiness" ADD CONSTRAINT "product_marketing_readiness_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_marketing_readiness" ADD CONSTRAINT "product_marketing_readiness_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_marketing_readiness" ADD CONSTRAINT "product_marketing_readiness_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_analysis_reports" ADD CONSTRAINT "trend_analysis_reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_analysis_reports" ADD CONSTRAINT "trend_analysis_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_analysis_reports" ADD CONSTRAINT "trend_analysis_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_analysis_reports" ADD CONSTRAINT "trend_analysis_reports_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_analysis_reports" ADD CONSTRAINT "trend_analysis_reports_profile_id_trend_watch_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."trend_watch_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_analysis_reports" ADD CONSTRAINT "trend_analysis_reports_agent_run_id_ai_employee_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."ai_employee_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_scores" ADD CONSTRAINT "trend_scores_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_scores" ADD CONSTRAINT "trend_scores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_scores" ADD CONSTRAINT "trend_scores_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_scores" ADD CONSTRAINT "trend_scores_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_scores" ADD CONSTRAINT "trend_scores_profile_id_trend_watch_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."trend_watch_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_scores" ADD CONSTRAINT "trend_scores_cluster_id_trend_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."trend_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_angles_workspace_launch_idx" ON "ad_angles" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "ad_copy_variants_workspace_launch_idx" ON "ad_copy_variants" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "ad_copy_variants_workspace_channel_idx" ON "ad_copy_variants" USING btree ("workspace_id","channel");--> statement-breakpoint
CREATE INDEX "audience_hypotheses_workspace_launch_idx" ON "audience_hypotheses" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "audience_hypotheses_workspace_channel_idx" ON "audience_hypotheses" USING btree ("workspace_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_voice_profiles_workspace_brand_unique" ON "brand_voice_profiles" USING btree ("workspace_id","brand_name");--> statement-breakpoint
CREATE INDEX "brand_voice_profiles_workspace_idx" ON "brand_voice_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "budget_recommendations_workspace_launch_idx" ON "budget_recommendations" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "budget_recommendations_workspace_review_idx" ON "budget_recommendations" USING btree ("workspace_id","review_status");--> statement-breakpoint
CREATE INDEX "campaign_approval_requests_workspace_launch_idx" ON "campaign_approval_requests" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "campaign_approval_requests_workspace_decision_idx" ON "campaign_approval_requests" USING btree ("workspace_id","owner_decision");--> statement-breakpoint
CREATE INDEX "campaign_drafts_workspace_launch_idx" ON "campaign_drafts" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "campaign_drafts_workspace_platform_idx" ON "campaign_drafts" USING btree ("workspace_id","platform");--> statement-breakpoint
CREATE INDEX "channel_recommendations_workspace_launch_idx" ON "channel_recommendations" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "channel_recommendations_workspace_priority_idx" ON "channel_recommendations" USING btree ("workspace_id","priority_score");--> statement-breakpoint
CREATE INDEX "creative_briefs_workspace_launch_idx" ON "creative_briefs" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "creative_briefs_workspace_type_idx" ON "creative_briefs" USING btree ("workspace_id","creative_type");--> statement-breakpoint
CREATE INDEX "landing_page_recommendations_workspace_launch_idx" ON "landing_page_recommendations" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "landing_page_recommendations_workspace_entity_idx" ON "landing_page_recommendations" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "lifecycle_campaign_flows_workspace_launch_idx" ON "lifecycle_campaign_flows" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "lifecycle_campaign_flows_workspace_trigger_idx" ON "lifecycle_campaign_flows" USING btree ("workspace_id","flow_trigger");--> statement-breakpoint
CREATE INDEX "marketing_launch_plans_workspace_source_idx" ON "marketing_launch_plans" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "marketing_launch_plans_workspace_status_idx" ON "marketing_launch_plans" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "marketing_source_runs_workspace_source_idx" ON "marketing_source_runs" USING btree ("workspace_id","source_key");--> statement-breakpoint
CREATE INDEX "marketing_source_runs_workspace_status_idx" ON "marketing_source_runs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_sources_workspace_source_unique" ON "marketing_sources" USING btree ("workspace_id","source_key");--> statement-breakpoint
CREATE INDEX "marketing_sources_workspace_idx" ON "marketing_sources" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "marketing_sources_workspace_enabled_idx" ON "marketing_sources" USING btree ("workspace_id","is_enabled");--> statement-breakpoint
CREATE INDEX "media_plan_drafts_workspace_launch_idx" ON "media_plan_drafts" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "media_plan_drafts_workspace_status_idx" ON "media_plan_drafts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "offer_hypotheses_workspace_launch_idx" ON "offer_hypotheses" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "organic_content_drafts_workspace_launch_idx" ON "organic_content_drafts" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "organic_content_drafts_workspace_type_idx" ON "organic_content_drafts" USING btree ("workspace_id","content_type");--> statement-breakpoint
CREATE INDEX "policy_review_results_workspace_target_idx" ON "policy_review_results" USING btree ("workspace_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "policy_review_results_workspace_verdict_idx" ON "policy_review_results" USING btree ("workspace_id","verdict");--> statement-breakpoint
CREATE INDEX "positioning_statements_workspace_launch_idx" ON "positioning_statements" USING btree ("workspace_id","launch_plan_id");--> statement-breakpoint
CREATE INDEX "product_concept_candidates_workspace_profile_idx" ON "product_concept_candidates" USING btree ("workspace_id","profile_id");--> statement-breakpoint
CREATE INDEX "product_concept_candidates_workspace_cluster_idx" ON "product_concept_candidates" USING btree ("workspace_id","cluster_id");--> statement-breakpoint
CREATE INDEX "product_concept_candidates_workspace_review_idx" ON "product_concept_candidates" USING btree ("workspace_id","review_status");--> statement-breakpoint
CREATE INDEX "product_marketing_readiness_workspace_entity_idx" ON "product_marketing_readiness" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "product_marketing_readiness_workspace_score_idx" ON "product_marketing_readiness" USING btree ("workspace_id","marketability_score");--> statement-breakpoint
CREATE INDEX "trend_analysis_reports_workspace_profile_idx" ON "trend_analysis_reports" USING btree ("workspace_id","profile_id");--> statement-breakpoint
CREATE INDEX "trend_analysis_reports_workspace_run_idx" ON "trend_analysis_reports" USING btree ("workspace_id","agent_run_id");--> statement-breakpoint
CREATE INDEX "trend_scores_workspace_profile_idx" ON "trend_scores" USING btree ("workspace_id","profile_id");--> statement-breakpoint
CREATE INDEX "trend_scores_workspace_cluster_idx" ON "trend_scores" USING btree ("workspace_id","cluster_id");--> statement-breakpoint
ALTER TABLE "trend_clusters" ADD CONSTRAINT "trend_clusters_profile_id_trend_watch_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."trend_watch_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trend_clusters_workspace_profile_idx" ON "trend_clusters" USING btree ("workspace_id","profile_id");