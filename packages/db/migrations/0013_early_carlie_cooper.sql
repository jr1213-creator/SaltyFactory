CREATE TABLE "ai_employee_transcript_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"run_id" text NOT NULL,
	"turn_index" integer DEFAULT 0 NOT NULL,
	"event_type" text NOT NULL,
	"role" text,
	"tool_name" text,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_employee_transcript_events" ADD CONSTRAINT "ai_employee_transcript_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_transcript_events" ADD CONSTRAINT "ai_employee_transcript_events_run_id_ai_employee_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_employee_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_employee_transcript_events_run_idx" ON "ai_employee_transcript_events" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ai_employee_transcript_events_workspace_run_idx" ON "ai_employee_transcript_events" USING btree ("workspace_id","run_id");--> statement-breakpoint
CREATE INDEX "ai_employee_transcript_events_type_idx" ON "ai_employee_transcript_events" USING btree ("event_type");