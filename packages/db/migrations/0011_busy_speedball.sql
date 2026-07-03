CREATE TABLE "setup_assistance_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_type" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"related_provider" text,
	"related_step_key" text
);
--> statement-breakpoint
ALTER TABLE "setup_assistance_requests" ADD CONSTRAINT "setup_assistance_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_assistance_requests" ADD CONSTRAINT "setup_assistance_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_assistance_requests" ADD CONSTRAINT "setup_assistance_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_assistance_requests" ADD CONSTRAINT "setup_assistance_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "setup_assistance_requests_workspace_status_idx" ON "setup_assistance_requests" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "setup_assistance_requests_workspace_provider_idx" ON "setup_assistance_requests" USING btree ("workspace_id","related_provider");