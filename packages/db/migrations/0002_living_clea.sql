CREATE TABLE "encrypted_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_key" text NOT NULL,
	"provider_connection_id" text,
	"credential_ref" text NOT NULL,
	"encrypted_payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provider_key" text NOT NULL,
	"provider_connection_id" text,
	"sync_type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"records_read" integer DEFAULT 0 NOT NULL,
	"records_written" integer DEFAULT 0 NOT NULL,
	"last_cursor" text,
	"error_code" text,
	"sanitized_error_message" text,
	"setup_required" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result_summary" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encrypted_credentials" ADD CONSTRAINT "encrypted_credentials_provider_connection_id_workspace_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."workspace_provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_runs" ADD CONSTRAINT "integration_sync_runs_provider_connection_id_workspace_provider_connections_id_fk" FOREIGN KEY ("provider_connection_id") REFERENCES "public"."workspace_provider_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "encrypted_credentials_ref_unique" ON "encrypted_credentials" USING btree ("workspace_id","credential_ref");--> statement-breakpoint
CREATE INDEX "encrypted_credentials_provider_idx" ON "encrypted_credentials" USING btree ("workspace_id","provider_key");--> statement-breakpoint
CREATE INDEX "encrypted_credentials_connection_idx" ON "encrypted_credentials" USING btree ("provider_connection_id");--> statement-breakpoint
CREATE INDEX "integration_sync_runs_provider_idx" ON "integration_sync_runs" USING btree ("workspace_id","provider_key");--> statement-breakpoint
CREATE INDEX "integration_sync_runs_status_idx" ON "integration_sync_runs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "integration_sync_runs_connection_idx" ON "integration_sync_runs" USING btree ("provider_connection_id");