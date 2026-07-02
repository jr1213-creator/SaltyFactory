CREATE TABLE "baseline_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"snapshot_name" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_label" text DEFAULT 'provider_imported' NOT NULL,
	"metrics_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"insufficient_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comparison_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"employee_attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'captured' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dropship_product_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"supplier_name" text NOT NULL,
	"supplier_url" text,
	"product_category" text DEFAULT 'other' NOT NULL,
	"product_title" text NOT NULL,
	"shipping_regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pricing_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"brand_fit_score" integer DEFAULT 0 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "listing_drafts_v1" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"target_channel" text NOT NULL,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_id" text,
	"title" text NOT NULL,
	"short_hook" text,
	"description" text DEFAULT '' NOT NULL,
	"price" numeric(12, 2),
	"approval_status" text DEFAULT 'draft' NOT NULL,
	"validation_status" text DEFAULT 'blocked' NOT NULL,
	"validation_blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"listing_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"export_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_wizard_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skipped_steps" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"readiness_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"first_thirty_day_plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_label" text DEFAULT 'rules_based' NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"wizard_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pod_migration_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"design_name" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_url" text,
	"source_listing_id" text,
	"original_product_type" text,
	"design_file_status" text DEFAULT 'missing' NOT NULL,
	"design_asset_id" text,
	"target_product_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readiness_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pricing_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"safety_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "social_content_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"channel_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"source_label" text DEFAULT 'rules_based' NOT NULL,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"source_id" text,
	"approval_status" text DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"published_manually_at" timestamp with time zone,
	"constraints_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_business_profiles_v1" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"business_name" text NOT NULL,
	"public_brand_name" text NOT NULL,
	"business_type" text DEFAULT 'hybrid' NOT NULL,
	"fulfillment_model" text DEFAULT 'hybrid' NOT NULL,
	"support_email" text,
	"country" text DEFAULT 'US' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"readiness_score" integer DEFAULT 0 NOT NULL,
	"readiness_blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"profile_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"channel_type" text NOT NULL,
	"category" text NOT NULL,
	"display_name" text NOT NULL,
	"url" text,
	"handle" text,
	"account_id" text,
	"status" text DEFAULT 'missing' NOT NULL,
	"owner_priority" integer DEFAULT 3 NOT NULL,
	"include_in_ai_recommendations" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp with time zone,
	"channel_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "baseline_snapshots" ADD CONSTRAINT "baseline_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_snapshots" ADD CONSTRAINT "baseline_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_snapshots" ADD CONSTRAINT "baseline_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baseline_snapshots" ADD CONSTRAINT "baseline_snapshots_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dropship_product_candidates" ADD CONSTRAINT "dropship_product_candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dropship_product_candidates" ADD CONSTRAINT "dropship_product_candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dropship_product_candidates" ADD CONSTRAINT "dropship_product_candidates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dropship_product_candidates" ADD CONSTRAINT "dropship_product_candidates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_drafts_v1" ADD CONSTRAINT "listing_drafts_v1_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_drafts_v1" ADD CONSTRAINT "listing_drafts_v1_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_drafts_v1" ADD CONSTRAINT "listing_drafts_v1_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_drafts_v1" ADD CONSTRAINT "listing_drafts_v1_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_wizard_runs" ADD CONSTRAINT "migration_wizard_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_wizard_runs" ADD CONSTRAINT "migration_wizard_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_wizard_runs" ADD CONSTRAINT "migration_wizard_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_wizard_runs" ADD CONSTRAINT "migration_wizard_runs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_migration_candidates" ADD CONSTRAINT "pod_migration_candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_migration_candidates" ADD CONSTRAINT "pod_migration_candidates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_migration_candidates" ADD CONSTRAINT "pod_migration_candidates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_migration_candidates" ADD CONSTRAINT "pod_migration_candidates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_migration_candidates" ADD CONSTRAINT "pod_migration_candidates_design_asset_id_design_assets_id_fk" FOREIGN KEY ("design_asset_id") REFERENCES "public"."design_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_content_items" ADD CONSTRAINT "social_content_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_content_items" ADD CONSTRAINT "social_content_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_content_items" ADD CONSTRAINT "social_content_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_content_items" ADD CONSTRAINT "social_content_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_business_profiles_v1" ADD CONSTRAINT "workspace_business_profiles_v1_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_business_profiles_v1" ADD CONSTRAINT "workspace_business_profiles_v1_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_business_profiles_v1" ADD CONSTRAINT "workspace_business_profiles_v1_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_business_profiles_v1" ADD CONSTRAINT "workspace_business_profiles_v1_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_channels" ADD CONSTRAINT "workspace_channels_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "baseline_snapshots_workspace_captured_idx" ON "baseline_snapshots" USING btree ("workspace_id","captured_at");--> statement-breakpoint
CREATE INDEX "baseline_snapshots_status_idx" ON "baseline_snapshots" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "dropship_product_candidates_workspace_status_idx" ON "dropship_product_candidates" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "dropship_product_candidates_category_idx" ON "dropship_product_candidates" USING btree ("workspace_id","product_category");--> statement-breakpoint
CREATE INDEX "listing_drafts_v1_workspace_status_idx" ON "listing_drafts_v1" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "listing_drafts_v1_approval_idx" ON "listing_drafts_v1" USING btree ("workspace_id","approval_status");--> statement-breakpoint
CREATE INDEX "migration_wizard_runs_workspace_status_idx" ON "migration_wizard_runs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "pod_migration_candidates_workspace_status_idx" ON "pod_migration_candidates" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "social_content_items_workspace_status_idx" ON "social_content_items" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "social_content_items_channel_idx" ON "social_content_items" USING btree ("workspace_id","channel_type");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_business_profiles_v1_workspace_unique" ON "workspace_business_profiles_v1" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_business_profiles_v1_status_idx" ON "workspace_business_profiles_v1" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "workspace_channels_type_idx" ON "workspace_channels" USING btree ("workspace_id","channel_type");--> statement-breakpoint
CREATE INDEX "workspace_channels_status_idx" ON "workspace_channels" USING btree ("workspace_id","status");