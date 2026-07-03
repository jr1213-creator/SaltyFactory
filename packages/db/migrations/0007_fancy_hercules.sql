CREATE TABLE "product_batch_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"batch_id" text NOT NULL,
	"product_draft_id" text,
	"sequence" integer NOT NULL,
	"stage" text DEFAULT 'idea' NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"stage_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "product_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"target_count" integer DEFAULT 15 NOT NULL,
	"trend_source" text,
	"product_mix" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"blocked_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_error" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD COLUMN "printify_upload_id" text;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD COLUMN "printify_variant_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD COLUMN "print_areas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD COLUMN "mockup_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD COLUMN "sync_status" text DEFAULT 'draft_created' NOT NULL;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "printify_product_refs" ADD COLUMN "source_record_id" text;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD COLUMN "admin_url" text;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD COLUMN "storefront_url" text;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD COLUMN "media" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD COLUMN "seo" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD COLUMN "sync_status" text DEFAULT 'draft_created' NOT NULL;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "shopify_product_refs" ADD COLUMN "source_record_id" text;--> statement-breakpoint
ALTER TABLE "product_batch_items" ADD CONSTRAINT "product_batch_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batch_items" ADD CONSTRAINT "product_batch_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batch_items" ADD CONSTRAINT "product_batch_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batch_items" ADD CONSTRAINT "product_batch_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batch_items" ADD CONSTRAINT "product_batch_items_batch_id_product_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."product_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batch_items" ADD CONSTRAINT "product_batch_items_product_draft_id_product_drafts_id_fk" FOREIGN KEY ("product_draft_id") REFERENCES "public"."product_drafts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_batch_items_batch_idx" ON "product_batch_items" USING btree ("workspace_id","batch_id");--> statement-breakpoint
CREATE INDEX "product_batch_items_draft_idx" ON "product_batch_items" USING btree ("product_draft_id");--> statement-breakpoint
CREATE INDEX "product_batch_items_stage_idx" ON "product_batch_items" USING btree ("workspace_id","stage");--> statement-breakpoint
CREATE INDEX "product_batches_workspace_status_idx" ON "product_batches" USING btree ("workspace_id","status");