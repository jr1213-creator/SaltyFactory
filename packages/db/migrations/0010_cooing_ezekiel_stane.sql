CREATE TABLE "ai_employee_model_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"default_model_id" text NOT NULL,
	"fallback_model_id" text,
	"escalation_model_id" text,
	"allowed_task_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_task_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_risk_level" text DEFAULT 'low' NOT NULL,
	"requires_owner_approval_for_escalation" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_model_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model_id" text NOT NULL,
	"eval_name" text NOT NULL,
	"task_type" text NOT NULL,
	"test_input_ref" text NOT NULL,
	"expected_behavior" text NOT NULL,
	"result_summary" text NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"score" integer,
	"failure_notes" text
);
--> statement-breakpoint
CREATE TABLE "ai_model_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_key" text NOT NULL,
	"display_name" text NOT NULL,
	"provider_type" text DEFAULT 'disabled' NOT NULL,
	"base_url" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"configured_status" text DEFAULT 'not_configured' NOT NULL,
	"supports_tools" boolean DEFAULT false NOT NULL,
	"supports_json" boolean DEFAULT false NOT NULL,
	"supports_vision" boolean DEFAULT false NOT NULL,
	"supports_long_context" boolean DEFAULT false NOT NULL,
	"max_context_tokens" integer,
	"cost_tier" text DEFAULT 'unknown' NOT NULL,
	"data_sensitivity_allowed" text DEFAULT 'public_only' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_model_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"employee_id" text,
	"model_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"task_type" text NOT NULL,
	"risk_level" text NOT NULL,
	"input_sensitivity" text NOT NULL,
	"status" text NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"estimated_cost" numeric(12, 6),
	"duration_ms" integer,
	"error_code" text
);
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_id" text NOT NULL,
	"model_key" text NOT NULL,
	"display_name" text NOT NULL,
	"model_family" text,
	"task_strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"context_window" integer,
	"recommended_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_for" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"cost_estimate" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rate_limit_estimate" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"eval_score" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_employee_model_assignments" ADD CONSTRAINT "ai_employee_model_assignments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_model_assignments" ADD CONSTRAINT "ai_employee_model_assignments_employee_id_ai_employee_definitions_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."ai_employee_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_model_assignments" ADD CONSTRAINT "ai_employee_model_assignments_default_model_id_ai_models_id_fk" FOREIGN KEY ("default_model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_model_assignments" ADD CONSTRAINT "ai_employee_model_assignments_fallback_model_id_ai_models_id_fk" FOREIGN KEY ("fallback_model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_model_assignments" ADD CONSTRAINT "ai_employee_model_assignments_escalation_model_id_ai_models_id_fk" FOREIGN KEY ("escalation_model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_evaluations" ADD CONSTRAINT "ai_model_evaluations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_evaluations" ADD CONSTRAINT "ai_model_evaluations_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_providers" ADD CONSTRAINT "ai_model_providers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_usage_events" ADD CONSTRAINT "ai_model_usage_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_usage_events" ADD CONSTRAINT "ai_model_usage_events_model_id_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."ai_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_usage_events" ADD CONSTRAINT "ai_model_usage_events_provider_id_ai_model_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_model_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_provider_id_ai_model_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_model_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_employee_model_assignments_employee_unique" ON "ai_employee_model_assignments" USING btree ("workspace_id","employee_id");--> statement-breakpoint
CREATE INDEX "ai_model_evaluations_model_idx" ON "ai_model_evaluations" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "ai_model_evaluations_workspace_task_idx" ON "ai_model_evaluations" USING btree ("workspace_id","task_type");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_model_providers_workspace_key_unique" ON "ai_model_providers" USING btree ("workspace_id","provider_key");--> statement-breakpoint
CREATE INDEX "ai_model_providers_workspace_status_idx" ON "ai_model_providers" USING btree ("workspace_id","configured_status");--> statement-breakpoint
CREATE INDEX "ai_model_usage_events_workspace_task_idx" ON "ai_model_usage_events" USING btree ("workspace_id","task_type");--> statement-breakpoint
CREATE INDEX "ai_model_usage_events_workspace_status_idx" ON "ai_model_usage_events" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_models_provider_model_unique" ON "ai_models" USING btree ("provider_id","model_key");--> statement-breakpoint
CREATE INDEX "ai_models_workspace_status_idx" ON "ai_models" USING btree ("workspace_id","status");