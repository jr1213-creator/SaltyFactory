CREATE TABLE "site_audit_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audit_run_id" text NOT NULL,
	"severity" text NOT NULL,
	"area" text NOT NULL,
	"message" text NOT NULL,
	"evidence" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_audit_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"website_url" text NOT NULL,
	"sitemap_url" text,
	"brand_name" text,
	"target_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"competitor_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"overall_score" integer DEFAULT 0 NOT NULL,
	"seo_score" integer DEFAULT 0 NOT NULL,
	"aeo_score" integer DEFAULT 0 NOT NULL,
	"geo_score" integer DEFAULT 0 NOT NULL,
	"structured_data_score" integer DEFAULT 0 NOT NULL,
	"crawlability_score" integer DEFAULT 0 NOT NULL,
	"product_schema_score" integer DEFAULT 0 NOT NULL,
	"content_quality_score" integer DEFAULT 0 NOT NULL,
	"conversion_readiness_score" integer DEFAULT 0 NOT NULL,
	"indicators" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recommended_fixes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_code" text,
	"error_message" text,
	"audited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_audit_findings" ADD CONSTRAINT "site_audit_findings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_audit_findings" ADD CONSTRAINT "site_audit_findings_audit_run_id_site_audit_runs_id_fk" FOREIGN KEY ("audit_run_id") REFERENCES "public"."site_audit_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_audit_findings" ADD CONSTRAINT "site_audit_findings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_audit_runs" ADD CONSTRAINT "site_audit_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_audit_runs" ADD CONSTRAINT "site_audit_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_audit_runs" ADD CONSTRAINT "site_audit_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_audit_runs" ADD CONSTRAINT "site_audit_runs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_audit_findings_run_idx" ON "site_audit_findings" USING btree ("audit_run_id");--> statement-breakpoint
CREATE INDEX "site_audit_findings_workspace_idx" ON "site_audit_findings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "site_audit_findings_severity_idx" ON "site_audit_findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "site_audit_runs_workspace_idx" ON "site_audit_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "site_audit_runs_audited_at_idx" ON "site_audit_runs" USING btree ("workspace_id","audited_at");--> statement-breakpoint
CREATE INDEX "site_audit_runs_status_idx" ON "site_audit_runs" USING btree ("status");