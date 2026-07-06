CREATE TABLE "approval_prediction_records" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approval_item_id" text NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"predicted_decision" text NOT NULL,
	"confidence_score" numeric(5, 4) DEFAULT '0.5000' NOT NULL,
	"confidence_reason" text NOT NULL,
	"actual_decision" text,
	"prediction_correct" boolean,
	"prediction_error_notes" text,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "approval_queue_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"requested_action" text NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"reason" text NOT NULL,
	"risk_summary" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "behavioral_consultations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consulting_agent_role_key" text NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"consultation_type" text NOT NULL,
	"input_summary" text NOT NULL,
	"output_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ethical_risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sensitive_attribute_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_score" numeric(5, 4) DEFAULT '0.5000' NOT NULL,
	"requires_policy_review" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_agent_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"role_key" text NOT NULL,
	"display_name" text NOT NULL,
	"purpose" text NOT NULL,
	"allowed_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_entity_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"output_entity_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_quality_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role_key" text NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"check_type" text NOT NULL,
	"verdict" text NOT NULL,
	"score" integer,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fix_suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"role_key" text NOT NULL,
	"source_entity_type" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"recommendation_type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"rationale" text NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"confidence_score" numeric(5, 4) DEFAULT '0.5000' NOT NULL,
	"expected_impact" text DEFAULT 'medium' NOT NULL,
	"owner_action_needed" text DEFAULT 'review' NOT NULL,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_approval_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approval_item_id" text NOT NULL,
	"owner_decision" text NOT NULL,
	"owner_notes" text,
	"edited_fields" jsonb,
	"rejection_reason" text,
	"preference_signal" jsonb
);
--> statement-breakpoint
CREATE TABLE "owner_decision_patterns" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pattern_type" text NOT NULL,
	"summary" text NOT NULL,
	"evidence_approval_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_score" numeric(5, 4) DEFAULT '0.3000' NOT NULL,
	"tentative" boolean DEFAULT true NOT NULL,
	"superseded_by" text,
	"last_observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_improvement_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finding_type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"affected_agents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"repeated_pattern" boolean DEFAULT false NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"recommended_process_change" text NOT NULL,
	"recommended_prompt_change" text,
	"recommended_tool_change" text,
	"recommended_schema_change" text,
	"review_status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_manager_briefs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"brief_date" text NOT NULL,
	"summary" text NOT NULL,
	"top_priorities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approvals_needed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_next_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"agent_health" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approval_prediction_records" ADD CONSTRAINT "approval_prediction_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue_items" ADD CONSTRAINT "approval_queue_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue_items" ADD CONSTRAINT "approval_queue_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_queue_items" ADD CONSTRAINT "approval_queue_items_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavioral_consultations" ADD CONSTRAINT "behavioral_consultations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_agent_roles" ADD CONSTRAINT "commerce_agent_roles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_agent_roles" ADD CONSTRAINT "commerce_agent_roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_agent_roles" ADD CONSTRAINT "commerce_agent_roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_agent_roles" ADD CONSTRAINT "commerce_agent_roles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_quality_checks" ADD CONSTRAINT "commerce_quality_checks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_recommendations" ADD CONSTRAINT "commerce_recommendations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_recommendations" ADD CONSTRAINT "commerce_recommendations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_recommendations" ADD CONSTRAINT "commerce_recommendations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_recommendations" ADD CONSTRAINT "commerce_recommendations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_approval_feedback" ADD CONSTRAINT "owner_approval_feedback_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_decision_patterns" ADD CONSTRAINT "owner_decision_patterns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_improvement_findings" ADD CONSTRAINT "process_improvement_findings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_manager_briefs" ADD CONSTRAINT "shop_manager_briefs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_prediction_records_workspace_item_idx" ON "approval_prediction_records" USING btree ("workspace_id","approval_item_id");--> statement-breakpoint
CREATE INDEX "approval_prediction_records_workspace_entity_idx" ON "approval_prediction_records" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "approval_queue_items_workspace_status_idx" ON "approval_queue_items" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "approval_queue_items_workspace_entity_idx" ON "approval_queue_items" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "behavioral_consultations_workspace_role_idx" ON "behavioral_consultations" USING btree ("workspace_id","consulting_agent_role_key");--> statement-breakpoint
CREATE INDEX "behavioral_consultations_workspace_entity_idx" ON "behavioral_consultations" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_agent_roles_workspace_role_unique" ON "commerce_agent_roles" USING btree ("workspace_id","role_key");--> statement-breakpoint
CREATE INDEX "commerce_agent_roles_workspace_enabled_idx" ON "commerce_agent_roles" USING btree ("workspace_id","is_enabled");--> statement-breakpoint
CREATE INDEX "commerce_quality_checks_workspace_role_idx" ON "commerce_quality_checks" USING btree ("workspace_id","role_key");--> statement-breakpoint
CREATE INDEX "commerce_quality_checks_workspace_entity_idx" ON "commerce_quality_checks" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "commerce_quality_checks_workspace_verdict_idx" ON "commerce_quality_checks" USING btree ("workspace_id","verdict");--> statement-breakpoint
CREATE INDEX "commerce_recommendations_workspace_role_idx" ON "commerce_recommendations" USING btree ("workspace_id","role_key");--> statement-breakpoint
CREATE INDEX "commerce_recommendations_workspace_entity_idx" ON "commerce_recommendations" USING btree ("workspace_id","source_entity_type","source_entity_id");--> statement-breakpoint
CREATE INDEX "commerce_recommendations_workspace_review_idx" ON "commerce_recommendations" USING btree ("workspace_id","review_status");--> statement-breakpoint
CREATE INDEX "owner_approval_feedback_workspace_item_idx" ON "owner_approval_feedback" USING btree ("workspace_id","approval_item_id");--> statement-breakpoint
CREATE INDEX "owner_approval_feedback_workspace_decision_idx" ON "owner_approval_feedback" USING btree ("workspace_id","owner_decision");--> statement-breakpoint
CREATE INDEX "owner_decision_patterns_workspace_type_idx" ON "owner_decision_patterns" USING btree ("workspace_id","pattern_type");--> statement-breakpoint
CREATE INDEX "owner_decision_patterns_workspace_active_idx" ON "owner_decision_patterns" USING btree ("workspace_id","superseded_by");--> statement-breakpoint
CREATE INDEX "process_improvement_findings_workspace_type_idx" ON "process_improvement_findings" USING btree ("workspace_id","finding_type");--> statement-breakpoint
CREATE INDEX "process_improvement_findings_workspace_review_idx" ON "process_improvement_findings" USING btree ("workspace_id","review_status");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_manager_briefs_workspace_date_unique" ON "shop_manager_briefs" USING btree ("workspace_id","brief_date");