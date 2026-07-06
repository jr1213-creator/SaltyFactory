CREATE TABLE "concierge_agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"agent_role" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"input_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"output_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failure_code" text
);
--> statement-breakpoint
CREATE TABLE "customer_design_approval_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"customer_note" text
);
--> statement-breakpoint
CREATE TABLE "customer_design_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"requirement_id" text,
	"candidate_index" integer NOT NULL,
	"title" text NOT NULL,
	"concept_summary" text NOT NULL,
	"prompt_text" text,
	"negative_prompt_text" text,
	"design_text" text,
	"visual_motifs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preview_asset_id" text,
	"preview_image_url" text,
	"policy_review_id" text,
	"readiness_check_id" text,
	"margin_analysis_id" text,
	"status" text DEFAULT 'candidate' NOT NULL,
	"risk_flags" jsonb
);
--> statement-breakpoint
CREATE TABLE "customer_design_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"sender" text NOT NULL,
	"message_text" text NOT NULL,
	"structured_payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "customer_design_publish_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"block_reason" text,
	"shopify_product_id" text,
	"shopify_handle" text,
	"purchase_url" text,
	"product_visibility" text DEFAULT 'customer_specific' NOT NULL,
	"safety_checks" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_design_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"product_type" text,
	"intended_use" text,
	"recipient" text,
	"location_context" text,
	"theme_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"style_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"color_terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"phrase_preferences" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_terms" jsonb,
	"quantity_intent" text,
	"deadline" text,
	"confidence_score" numeric(5, 4) DEFAULT '0.5000' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_design_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_token_hash" text NOT NULL,
	"customer_id" text,
	"anonymous_id" text,
	"source_route" text,
	"coarse_location" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_intent_summary" text,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_specific_products" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"publish_job_id" text NOT NULL,
	"shopify_product_id" text NOT NULL,
	"shopify_handle" text,
	"purchase_url" text,
	"expires_at" timestamp with time zone,
	"promoted_to_public" boolean DEFAULT false NOT NULL,
	"owner_review_status" text DEFAULT 'not_requested' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storefront_products_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shopify_product_id" text NOT NULL,
	"handle" text NOT NULL,
	"title" text NOT NULL,
	"description_excerpt" text,
	"vendor" text,
	"product_type" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_min" numeric(12, 2),
	"price_max" numeric(12, 2),
	"currency" text,
	"available_for_sale" boolean,
	"source_updated_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "concierge_agent_runs" ADD CONSTRAINT "concierge_agent_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concierge_agent_runs" ADD CONSTRAINT "concierge_agent_runs_session_id_customer_design_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."customer_design_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_approval_events" ADD CONSTRAINT "customer_design_approval_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_approval_events" ADD CONSTRAINT "customer_design_approval_events_session_id_customer_design_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."customer_design_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_approval_events" ADD CONSTRAINT "customer_design_approval_events_candidate_id_customer_design_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."customer_design_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_candidates" ADD CONSTRAINT "customer_design_candidates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_candidates" ADD CONSTRAINT "customer_design_candidates_session_id_customer_design_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."customer_design_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_candidates" ADD CONSTRAINT "customer_design_candidates_requirement_id_customer_design_requirements_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."customer_design_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_candidates" ADD CONSTRAINT "customer_design_candidates_policy_review_id_policy_review_results_id_fk" FOREIGN KEY ("policy_review_id") REFERENCES "public"."policy_review_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_candidates" ADD CONSTRAINT "customer_design_candidates_readiness_check_id_product_readiness_checks_id_fk" FOREIGN KEY ("readiness_check_id") REFERENCES "public"."product_readiness_checks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_candidates" ADD CONSTRAINT "customer_design_candidates_margin_analysis_id_margin_analysis_id_fk" FOREIGN KEY ("margin_analysis_id") REFERENCES "public"."margin_analysis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_messages" ADD CONSTRAINT "customer_design_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_messages" ADD CONSTRAINT "customer_design_messages_session_id_customer_design_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."customer_design_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_publish_jobs" ADD CONSTRAINT "customer_design_publish_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_publish_jobs" ADD CONSTRAINT "customer_design_publish_jobs_session_id_customer_design_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."customer_design_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_publish_jobs" ADD CONSTRAINT "customer_design_publish_jobs_candidate_id_customer_design_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."customer_design_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_requirements" ADD CONSTRAINT "customer_design_requirements_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_requirements" ADD CONSTRAINT "customer_design_requirements_session_id_customer_design_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."customer_design_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_design_sessions" ADD CONSTRAINT "customer_design_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_specific_products" ADD CONSTRAINT "customer_specific_products_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_specific_products" ADD CONSTRAINT "customer_specific_products_session_id_customer_design_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."customer_design_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_specific_products" ADD CONSTRAINT "customer_specific_products_candidate_id_customer_design_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."customer_design_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_specific_products" ADD CONSTRAINT "customer_specific_products_publish_job_id_customer_design_publish_jobs_id_fk" FOREIGN KEY ("publish_job_id") REFERENCES "public"."customer_design_publish_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storefront_products_cache" ADD CONSTRAINT "storefront_products_cache_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concierge_agent_runs_workspace_session_idx" ON "concierge_agent_runs" USING btree ("workspace_id","session_id");--> statement-breakpoint
CREATE INDEX "concierge_agent_runs_workspace_role_idx" ON "concierge_agent_runs" USING btree ("workspace_id","agent_role");--> statement-breakpoint
CREATE INDEX "customer_design_approval_events_workspace_session_idx" ON "customer_design_approval_events" USING btree ("workspace_id","session_id");--> statement-breakpoint
CREATE INDEX "customer_design_approval_events_workspace_candidate_idx" ON "customer_design_approval_events" USING btree ("workspace_id","candidate_id");--> statement-breakpoint
CREATE INDEX "customer_design_candidates_workspace_session_idx" ON "customer_design_candidates" USING btree ("workspace_id","session_id");--> statement-breakpoint
CREATE INDEX "customer_design_candidates_workspace_status_idx" ON "customer_design_candidates" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "customer_design_messages_workspace_session_idx" ON "customer_design_messages" USING btree ("workspace_id","session_id");--> statement-breakpoint
CREATE INDEX "customer_design_messages_workspace_sender_idx" ON "customer_design_messages" USING btree ("workspace_id","sender");--> statement-breakpoint
CREATE INDEX "customer_design_publish_jobs_workspace_session_idx" ON "customer_design_publish_jobs" USING btree ("workspace_id","session_id");--> statement-breakpoint
CREATE INDEX "customer_design_publish_jobs_workspace_status_idx" ON "customer_design_publish_jobs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "customer_design_requirements_workspace_session_idx" ON "customer_design_requirements" USING btree ("workspace_id","session_id");--> statement-breakpoint
CREATE INDEX "customer_design_sessions_workspace_token_idx" ON "customer_design_sessions" USING btree ("workspace_id","session_token_hash");--> statement-breakpoint
CREATE INDEX "customer_design_sessions_workspace_status_idx" ON "customer_design_sessions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "customer_design_sessions_workspace_expires_idx" ON "customer_design_sessions" USING btree ("workspace_id","expires_at");--> statement-breakpoint
CREATE INDEX "customer_specific_products_workspace_session_idx" ON "customer_specific_products" USING btree ("workspace_id","session_id");--> statement-breakpoint
CREATE INDEX "customer_specific_products_workspace_review_idx" ON "customer_specific_products" USING btree ("workspace_id","owner_review_status");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_products_cache_workspace_handle_unique" ON "storefront_products_cache" USING btree ("workspace_id","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "storefront_products_cache_workspace_shopify_product_unique" ON "storefront_products_cache" USING btree ("workspace_id","shopify_product_id");--> statement-breakpoint
CREATE INDEX "storefront_products_cache_workspace_available_idx" ON "storefront_products_cache" USING btree ("workspace_id","available_for_sale");