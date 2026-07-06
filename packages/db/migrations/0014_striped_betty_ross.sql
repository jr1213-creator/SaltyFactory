CREATE TABLE "rejected_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"signal_id" text NOT NULL,
	"rejected_by" text,
	"reason" text NOT NULL,
	"rejected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_citations" (
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
	"source_id" text,
	"source_key" text NOT NULL,
	"citation_url" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trend_signal_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profile_id" text NOT NULL,
	"source_id" text NOT NULL,
	"source_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"failure_code" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"raw_signal_count" integer DEFAULT 0 NOT NULL,
	"normalized_signal_count" integer DEFAULT 0 NOT NULL,
	"citation_count" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "trend_watch_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"niche_name" text NOT NULL,
	"target_customer" text NOT NULL,
	"product_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seed_phrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visual_motifs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brand_palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seasonality_windows" jsonb,
	"geographic_focus" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_range_min" numeric(12, 2),
	"price_range_max" numeric(12, 2),
	"product_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allowed_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score_weights" jsonb,
	"freshness_window_days" integer DEFAULT 30 NOT NULL,
	"min_signal_threshold" integer DEFAULT 1 NOT NULL,
	"risk_filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"watchlist_stores" jsonb,
	"marketplace_focus" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "profile_id" text;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "run_id" text;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "source_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "signal_type" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "external_identifier" text;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "raw_value" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "normalized_keyword" text;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "normalized_title" text;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "normalized_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "normalized_motif_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "metric_value" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "metric_type" text;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "price_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "price_currency" text;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "observed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "citation_url" text;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD COLUMN "risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "source_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "access_mode" text DEFAULT 'manual_observation' NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "auth_status" text DEFAULT 'not_configured' NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "approval_status" text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "risk_level" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "commercial_use_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "requires_credential" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "requires_approval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "is_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "is_trusted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "allowed_use_notes" text;--> statement-breakpoint
ALTER TABLE "trend_sources" ADD COLUMN "last_successful_fetch_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rejected_signals" ADD CONSTRAINT "rejected_signals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_signals" ADD CONSTRAINT "rejected_signals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_signals" ADD CONSTRAINT "rejected_signals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_signals" ADD CONSTRAINT "rejected_signals_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_signals" ADD CONSTRAINT "rejected_signals_signal_id_trend_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."trend_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_citations" ADD CONSTRAINT "source_citations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_citations" ADD CONSTRAINT "source_citations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_citations" ADD CONSTRAINT "source_citations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_citations" ADD CONSTRAINT "source_citations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_citations" ADD CONSTRAINT "source_citations_source_id_trend_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."trend_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signal_runs" ADD CONSTRAINT "trend_signal_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signal_runs" ADD CONSTRAINT "trend_signal_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signal_runs" ADD CONSTRAINT "trend_signal_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signal_runs" ADD CONSTRAINT "trend_signal_runs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signal_runs" ADD CONSTRAINT "trend_signal_runs_profile_id_trend_watch_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."trend_watch_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signal_runs" ADD CONSTRAINT "trend_signal_runs_source_id_trend_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."trend_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_watch_profiles" ADD CONSTRAINT "trend_watch_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_watch_profiles" ADD CONSTRAINT "trend_watch_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_watch_profiles" ADD CONSTRAINT "trend_watch_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_watch_profiles" ADD CONSTRAINT "trend_watch_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rejected_signals_workspace_signal_idx" ON "rejected_signals" USING btree ("workspace_id","signal_id");--> statement-breakpoint
CREATE INDEX "rejected_signals_workspace_rejected_at_idx" ON "rejected_signals" USING btree ("workspace_id","rejected_at");--> statement-breakpoint
CREATE INDEX "source_citations_workspace_entity_idx" ON "source_citations" USING btree ("workspace_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "source_citations_workspace_source_idx" ON "source_citations" USING btree ("workspace_id","source_key");--> statement-breakpoint
CREATE INDEX "trend_signal_runs_workspace_profile_idx" ON "trend_signal_runs" USING btree ("workspace_id","profile_id");--> statement-breakpoint
CREATE INDEX "trend_signal_runs_workspace_source_idx" ON "trend_signal_runs" USING btree ("workspace_id","source_key");--> statement-breakpoint
CREATE INDEX "trend_signal_runs_workspace_status_idx" ON "trend_signal_runs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "trend_watch_profiles_workspace_niche_idx" ON "trend_watch_profiles" USING btree ("workspace_id","niche_name");--> statement-breakpoint
CREATE INDEX "trend_watch_profiles_workspace_active_idx" ON "trend_watch_profiles" USING btree ("workspace_id","is_active");--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_profile_id_trend_watch_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."trend_watch_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_signals" ADD CONSTRAINT "trend_signals_run_id_trend_signal_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."trend_signal_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trend_signals_source_key_idx" ON "trend_signals" USING btree ("workspace_id","source_key");--> statement-breakpoint
CREATE INDEX "trend_signals_profile_idx" ON "trend_signals" USING btree ("workspace_id","profile_id");--> statement-breakpoint
CREATE INDEX "trend_signals_run_idx" ON "trend_signals" USING btree ("workspace_id","run_id");--> statement-breakpoint
CREATE INDEX "trend_sources_workspace_source_key_idx" ON "trend_sources" USING btree ("workspace_id","source_key");