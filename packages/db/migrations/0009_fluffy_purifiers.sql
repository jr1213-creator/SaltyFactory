CREATE TABLE "ai_agent_feedback_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_employee_id" text NOT NULL,
	"target_employee_id" text,
	"feedback_type" text NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"suggested_resolution" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_capability_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"requested_by_employee_id" text,
	"employee_id" text NOT NULL,
	"capability_name" text NOT NULL,
	"reason_needed" text NOT NULL,
	"current_limitation" text NOT NULL,
	"requested_permission_level" text DEFAULT 'recommend' NOT NULL,
	"requested_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requested_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proposed_guardrails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approval_id" text
);
--> statement-breakpoint
CREATE TABLE "ai_employee_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"role_title" text NOT NULL,
	"department" text NOT NULL,
	"mission" text NOT NULL,
	"status" text DEFAULT 'setup_needed' NOT NULL,
	"allowed_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allowed_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"guardrails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prompt_profile" text NOT NULL,
	"created_from_hire_request_id" text,
	"approved_by" text,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_employee_hire_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"requested_by_employee_id" text,
	"requested_by_user_id" text,
	"requested_role_title" text NOT NULL,
	"department" text NOT NULL,
	"reason_needed" text NOT NULL,
	"detected_gap" text NOT NULL,
	"business_case" text NOT NULL,
	"status" text DEFAULT 'needs_review' NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"source_record_id" text,
	"approval_id" text,
	"owner_notes" text
);
--> statement-breakpoint
CREATE TABLE "ai_employee_permission_scopes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"employee_id" text NOT NULL,
	"scope" text NOT NULL,
	"permission_level" text DEFAULT 'draft' NOT NULL,
	"requires_owner_approval" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_employee_role_specs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hire_request_id" text NOT NULL,
	"role_title" text NOT NULL,
	"mission" text NOT NULL,
	"responsibilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"qualifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_inputs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_outputs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allowed_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allowed_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"forbidden_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_guardrails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"success_metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failure_modes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"test_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"onboarding_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prompt_profile" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_improvement_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suggested_by_employee_id" text,
	"suggested_by_user_id" text,
	"suggestion_type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"observed_problem" text NOT NULL,
	"affected_workflow" text NOT NULL,
	"affected_employee_id" text,
	"affected_route" text,
	"affected_provider" text,
	"current_behavior" text NOT NULL,
	"proposed_improvement" text NOT NULL,
	"business_value" text NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"implementation_complexity" text DEFAULT 'medium' NOT NULL,
	"expected_impact" text DEFAULT 'medium' NOT NULL,
	"owner_decision" text DEFAULT 'pending' NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"source_record_id" text,
	"approval_id" text,
	"owner_notes" text
);
--> statement-breakpoint
CREATE TABLE "ai_tool_access_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"requested_by_employee_id" text,
	"employee_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"provider_name" text,
	"requested_access_level" text DEFAULT 'recommend' NOT NULL,
	"reason_needed" text NOT NULL,
	"actions_requested" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions_forbidden" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_review" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"proposed_guardrails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"approval_id" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_training_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"requested_by_employee_id" text,
	"employee_id" text NOT NULL,
	"training_topic" text NOT NULL,
	"reason_needed" text NOT NULL,
	"current_gap" text NOT NULL,
	"desired_outcome" text NOT NULL,
	"proposed_training_materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_outputs_after_training" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validation_tests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approval_id" text
);
--> statement-breakpoint
CREATE TABLE "business_authority_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"requested_by_employee_id" text,
	"requested_by_user_id" text,
	"authority_type" text NOT NULL,
	"reason_needed" text NOT NULL,
	"fields_requested" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proposed_use" text NOT NULL,
	"risk_level" text DEFAULT 'high' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approval_id" text,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "business_bank_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"connection_method" text NOT NULL,
	"institution_name" text NOT NULL,
	"institution_id" text,
	"account_name" text,
	"account_type" text,
	"masked_account" text,
	"status" text DEFAULT 'not_configured' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"consent_status" text DEFAULT 'not_requested' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_bank_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bank_connection_id" text NOT NULL,
	"external_transaction_id" text,
	"transaction_date" text NOT NULL,
	"description" text NOT NULL,
	"merchant_name" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"category" text,
	"business_category" text,
	"classification_status" text DEFAULT 'unclassified' NOT NULL,
	"confidence" numeric(5, 4),
	"related_entity_type" text,
	"related_entity_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "business_channel_readiness" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"readiness" text DEFAULT 'unknown' NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_budget" numeric(12, 2),
	"break_even_roas" numeric(12, 4),
	"required_owner_approval" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_cost_inputs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cost_type" text NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"cadence" text NOT NULL,
	"applies_to_entity_type" text,
	"applies_to_entity_id" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"assumptions" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_decision_memos" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"title" text NOT NULL,
	"decision_type" text NOT NULL,
	"recommendation" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"financial_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_owner_approval" boolean DEFAULT true NOT NULL,
	"owner_decision" text DEFAULT 'pending' NOT NULL,
	"created_by_employee_id" text,
	"approval_id" text
);
--> statement-breakpoint
CREATE TABLE "business_document_exports" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_id" text NOT NULL,
	"export_type" text NOT NULL,
	"file_ref" text NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"document_type" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_data_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_file_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requires_sensitive_data" boolean DEFAULT false NOT NULL,
	"sensitive_fields_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owner_approval_id" text,
	"created_by_employee_id" text
);
--> statement-breakpoint
CREATE TABLE "business_experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"hypothesis" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"success_metric" text NOT NULL,
	"baseline_value" text,
	"target_value" text,
	"start_date" text,
	"end_date" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"result_summary" text
);
--> statement-breakpoint
CREATE TABLE "business_forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"forecast_name" text NOT NULL,
	"revenue_goal" numeric(12, 2) NOT NULL,
	"average_order_value" numeric(12, 2) NOT NULL,
	"conversion_rate_assumption" numeric(7, 3) NOT NULL,
	"traffic_assumption" integer NOT NULL,
	"repeat_purchase_assumption" numeric(7, 3) NOT NULL,
	"margin_assumption" numeric(7, 3) NOT NULL,
	"marketing_spend_assumption" numeric(12, 2) DEFAULT '0' NOT NULL,
	"fixed_cost_assumption" numeric(12, 2) DEFAULT '0' NOT NULL,
	"output" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"goal_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"target_value" text,
	"target_date" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"related_business_area" text,
	"progress_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_notes" text
);
--> statement-breakpoint
CREATE TABLE "business_mantras" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mantra" text NOT NULL,
	"category" text DEFAULT 'brand' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_metrics_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snapshot_date" text NOT NULL,
	"revenue_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"orders_total" integer DEFAULT 0 NOT NULL,
	"average_order_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gross_margin_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"contribution_margin_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"marketing_spend_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"roas_estimate" numeric(12, 4),
	"mer_estimate" numeric(12, 4),
	"cac_estimate" numeric(12, 2),
	"repeat_customer_rate" numeric(7, 3),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "business_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opportunity_type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"affected_products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_customers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_campaigns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_value" numeric(12, 2),
	"confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"recommended_next_action" text NOT NULL,
	"owner_decision" text DEFAULT 'pending' NOT NULL,
	"source_record_id" text,
	"approval_id" text
);
--> statement-breakpoint
CREATE TABLE "business_print_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_id" text NOT NULL,
	"vendor" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'print_packet_ready' NOT NULL,
	"pickup_location" text,
	"estimated_price" numeric(12, 2),
	"print_specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checkout_url" text,
	"handoff_instructions" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legal_business_name" text NOT NULL,
	"public_brand_name" text NOT NULL,
	"dba_name" text,
	"business_type" text DEFAULT 'unknown' NOT NULL,
	"state_of_registration" text,
	"formation_date" text,
	"business_email" text,
	"business_phone" text,
	"website_url" text,
	"primary_domain" text,
	"public_address" text,
	"private_address_ref" text,
	"registered_agent_name" text,
	"registered_agent_address_ref" text,
	"ein_status" text DEFAULT 'unknown' NOT NULL,
	"ein_secret_ref" text,
	"sales_tax_status" text DEFAULT 'unknown' NOT NULL,
	"banking_provider_name" text,
	"primary_bank_connection_id" text,
	"business_purpose" text,
	"mission_statement" text,
	"brand_mantra" text,
	"operating_principles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"owner_goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brand_voice" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"target_customers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "business_sensitive_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"field_name" text NOT NULL,
	"secret_ref" text NOT NULL,
	"masked_display_value" text NOT NULL,
	"sensitivity_level" text DEFAULT 'restricted' NOT NULL,
	"access_policy" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_unit_economics" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"sale_price" numeric(12, 2) NOT NULL,
	"product_cost" numeric(12, 2) NOT NULL,
	"shipping_cost_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"platform_fee_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_fee_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ad_spend_allocation_estimate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"contribution_margin" numeric(12, 2) NOT NULL,
	"contribution_margin_percent" numeric(7, 3) NOT NULL,
	"break_even_cac" numeric(12, 2) NOT NULL,
	"break_even_roas" numeric(12, 4),
	"minimum_margin_threshold" numeric(7, 3) DEFAULT '35' NOT NULL,
	"status" text DEFAULT 'unknown' NOT NULL,
	"assumptions" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_agent_feedback_events" ADD CONSTRAINT "ai_agent_feedback_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_capability_requests" ADD CONSTRAINT "ai_capability_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_capability_requests" ADD CONSTRAINT "ai_capability_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_capability_requests" ADD CONSTRAINT "ai_capability_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_capability_requests" ADD CONSTRAINT "ai_capability_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_capability_requests" ADD CONSTRAINT "ai_capability_requests_requested_by_employee_id_ai_employees_id_fk" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_definitions" ADD CONSTRAINT "ai_employee_definitions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_definitions" ADD CONSTRAINT "ai_employee_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_definitions" ADD CONSTRAINT "ai_employee_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_definitions" ADD CONSTRAINT "ai_employee_definitions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_definitions" ADD CONSTRAINT "ai_employee_definitions_created_from_hire_request_id_ai_employee_hire_requests_id_fk" FOREIGN KEY ("created_from_hire_request_id") REFERENCES "public"."ai_employee_hire_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_definitions" ADD CONSTRAINT "ai_employee_definitions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_hire_requests" ADD CONSTRAINT "ai_employee_hire_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_hire_requests" ADD CONSTRAINT "ai_employee_hire_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_hire_requests" ADD CONSTRAINT "ai_employee_hire_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_hire_requests" ADD CONSTRAINT "ai_employee_hire_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_hire_requests" ADD CONSTRAINT "ai_employee_hire_requests_requested_by_employee_id_ai_employees_id_fk" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_hire_requests" ADD CONSTRAINT "ai_employee_hire_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_permission_scopes" ADD CONSTRAINT "ai_employee_permission_scopes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_permission_scopes" ADD CONSTRAINT "ai_employee_permission_scopes_employee_id_ai_employee_definitions_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."ai_employee_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_role_specs" ADD CONSTRAINT "ai_employee_role_specs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_employee_role_specs" ADD CONSTRAINT "ai_employee_role_specs_hire_request_id_ai_employee_hire_requests_id_fk" FOREIGN KEY ("hire_request_id") REFERENCES "public"."ai_employee_hire_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_improvement_suggestions" ADD CONSTRAINT "ai_improvement_suggestions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_improvement_suggestions" ADD CONSTRAINT "ai_improvement_suggestions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_improvement_suggestions" ADD CONSTRAINT "ai_improvement_suggestions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_improvement_suggestions" ADD CONSTRAINT "ai_improvement_suggestions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_improvement_suggestions" ADD CONSTRAINT "ai_improvement_suggestions_suggested_by_employee_id_ai_employees_id_fk" FOREIGN KEY ("suggested_by_employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_improvement_suggestions" ADD CONSTRAINT "ai_improvement_suggestions_suggested_by_user_id_users_id_fk" FOREIGN KEY ("suggested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_access_requests" ADD CONSTRAINT "ai_tool_access_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_access_requests" ADD CONSTRAINT "ai_tool_access_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_access_requests" ADD CONSTRAINT "ai_tool_access_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_access_requests" ADD CONSTRAINT "ai_tool_access_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_access_requests" ADD CONSTRAINT "ai_tool_access_requests_requested_by_employee_id_ai_employees_id_fk" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_requests" ADD CONSTRAINT "ai_training_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_requests" ADD CONSTRAINT "ai_training_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_requests" ADD CONSTRAINT "ai_training_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_requests" ADD CONSTRAINT "ai_training_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_training_requests" ADD CONSTRAINT "ai_training_requests_requested_by_employee_id_ai_employees_id_fk" FOREIGN KEY ("requested_by_employee_id") REFERENCES "public"."ai_employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_authority_requests" ADD CONSTRAINT "business_authority_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_authority_requests" ADD CONSTRAINT "business_authority_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_authority_requests" ADD CONSTRAINT "business_authority_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_authority_requests" ADD CONSTRAINT "business_authority_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_authority_requests" ADD CONSTRAINT "business_authority_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_bank_connections" ADD CONSTRAINT "business_bank_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_bank_transactions" ADD CONSTRAINT "business_bank_transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_bank_transactions" ADD CONSTRAINT "business_bank_transactions_bank_connection_id_business_bank_connections_id_fk" FOREIGN KEY ("bank_connection_id") REFERENCES "public"."business_bank_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_channel_readiness" ADD CONSTRAINT "business_channel_readiness_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cost_inputs" ADD CONSTRAINT "business_cost_inputs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_decision_memos" ADD CONSTRAINT "business_decision_memos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_decision_memos" ADD CONSTRAINT "business_decision_memos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_decision_memos" ADD CONSTRAINT "business_decision_memos_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_decision_memos" ADD CONSTRAINT "business_decision_memos_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_document_exports" ADD CONSTRAINT "business_document_exports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_document_exports" ADD CONSTRAINT "business_document_exports_document_id_business_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."business_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_documents" ADD CONSTRAINT "business_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_experiments" ADD CONSTRAINT "business_experiments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_forecasts" ADD CONSTRAINT "business_forecasts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_goals" ADD CONSTRAINT "business_goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_mantras" ADD CONSTRAINT "business_mantras_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_metrics_snapshots" ADD CONSTRAINT "business_metrics_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_opportunities" ADD CONSTRAINT "business_opportunities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_opportunities" ADD CONSTRAINT "business_opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_opportunities" ADD CONSTRAINT "business_opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_opportunities" ADD CONSTRAINT "business_opportunities_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_print_orders" ADD CONSTRAINT "business_print_orders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_print_orders" ADD CONSTRAINT "business_print_orders_document_id_business_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."business_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_sensitive_fields" ADD CONSTRAINT "business_sensitive_fields_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_unit_economics" ADD CONSTRAINT "business_unit_economics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_agent_feedback_events_workspace_status_idx" ON "ai_agent_feedback_events" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_capability_requests_workspace_status_idx" ON "ai_capability_requests" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_employee_definitions_workspace_status_idx" ON "ai_employee_definitions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_employee_definitions_hire_request_unique" ON "ai_employee_definitions" USING btree ("created_from_hire_request_id");--> statement-breakpoint
CREATE INDEX "ai_employee_hire_requests_workspace_status_idx" ON "ai_employee_hire_requests" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_employee_hire_requests_role_idx" ON "ai_employee_hire_requests" USING btree ("workspace_id","requested_role_title");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_employee_permission_scopes_unique" ON "ai_employee_permission_scopes" USING btree ("employee_id","scope");--> statement-breakpoint
CREATE INDEX "ai_employee_role_specs_workspace_idx" ON "ai_employee_role_specs" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_employee_role_specs_hire_unique" ON "ai_employee_role_specs" USING btree ("hire_request_id");--> statement-breakpoint
CREATE INDEX "ai_improvement_suggestions_workspace_status_idx" ON "ai_improvement_suggestions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_improvement_suggestions_type_idx" ON "ai_improvement_suggestions" USING btree ("workspace_id","suggestion_type");--> statement-breakpoint
CREATE INDEX "ai_tool_access_requests_workspace_status_idx" ON "ai_tool_access_requests" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_training_requests_workspace_status_idx" ON "ai_training_requests" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "business_authority_requests_workspace_status_idx" ON "business_authority_requests" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "business_bank_connections_workspace_status_idx" ON "business_bank_connections" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "business_bank_transactions_connection_idx" ON "business_bank_transactions" USING btree ("workspace_id","bank_connection_id");--> statement-breakpoint
CREATE INDEX "business_bank_transactions_external_idx" ON "business_bank_transactions" USING btree ("external_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_channel_readiness_entity_channel_unique" ON "business_channel_readiness" USING btree ("workspace_id","entity_type","entity_id","channel");--> statement-breakpoint
CREATE INDEX "business_cost_inputs_workspace_entity_idx" ON "business_cost_inputs" USING btree ("workspace_id","applies_to_entity_type","applies_to_entity_id");--> statement-breakpoint
CREATE INDEX "business_decision_memos_workspace_decision_idx" ON "business_decision_memos" USING btree ("workspace_id","owner_decision");--> statement-breakpoint
CREATE INDEX "business_document_exports_document_idx" ON "business_document_exports" USING btree ("workspace_id","document_id");--> statement-breakpoint
CREATE INDEX "business_documents_workspace_status_idx" ON "business_documents" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "business_experiments_workspace_status_idx" ON "business_experiments" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "business_forecasts_workspace_status_idx" ON "business_forecasts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "business_goals_workspace_status_idx" ON "business_goals" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "business_mantras_workspace_active_idx" ON "business_mantras" USING btree ("workspace_id","active");--> statement-breakpoint
CREATE INDEX "business_metrics_snapshots_workspace_date_idx" ON "business_metrics_snapshots" USING btree ("workspace_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "business_opportunities_workspace_decision_idx" ON "business_opportunities" USING btree ("workspace_id","owner_decision");--> statement-breakpoint
CREATE INDEX "business_print_orders_workspace_status_idx" ON "business_print_orders" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "business_profiles_workspace_unique" ON "business_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_sensitive_fields_unique" ON "business_sensitive_fields" USING btree ("workspace_id","entity_type","entity_id","field_name");--> statement-breakpoint
CREATE UNIQUE INDEX "business_unit_economics_entity_unique" ON "business_unit_economics" USING btree ("workspace_id","entity_type","entity_id");