CREATE TABLE "crm_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"address_type" text DEFAULT 'shipping' NOT NULL,
	"name" text,
	"line1" text,
	"line2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text DEFAULT 'US' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_ai_insights" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"insight_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"confidence" numeric(5, 4) DEFAULT '0' NOT NULL,
	"approval_status" text DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_appointment_types" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"booking_readiness" text DEFAULT 'manual_setup_required' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_automation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"trigger_key" text NOT NULL,
	"conditions_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actions_json" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_automation_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"automation_rule_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"result_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_availability_readiness" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"calendar_provider" text DEFAULT 'manual' NOT NULL,
	"setup_required_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crm_behavior_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rule_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_behavioral_traits" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"trait_key" text NOT NULL,
	"trait_value" text,
	"confidence" numeric(5, 4) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_booking_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"appointment_type_id" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"preferred_times_json" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_campaign_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"campaign_id" text,
	"customer_id" text,
	"lead_id" text,
	"enrolled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crm_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"target_segment_id" text,
	"consent_required" boolean DEFAULT true NOT NULL,
	"campaign_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"website_url" text,
	"company_type" text DEFAULT 'account' NOT NULL,
	"lifecycle_stage" text DEFAULT 'prospect' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "crm_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"email" text,
	"consent_type" text DEFAULT 'marketing' NOT NULL,
	"consented_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crm_consultations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"appointment_type_id" text,
	"scheduled_for" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "crm_contact_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"method_type" text NOT NULL,
	"value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"consent_status" text DEFAULT 'unknown' NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_conversation_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"conversation_id" text,
	"customer_id" text,
	"direction" text DEFAULT 'internal' NOT NULL,
	"body" text NOT NULL,
	"message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sender_label" text
);
--> statement-breakpoint
CREATE TABLE "crm_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"channel" text DEFAULT 'manual' NOT NULL,
	"subject" text,
	"last_message_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crm_customer_cohorts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rule_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_data_required" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_customer_external_refs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"provider_key" text NOT NULL,
	"external_id" text NOT NULL,
	"external_url" text
);
--> statement-breakpoint
CREATE TABLE "crm_customer_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"metric_key" text NOT NULL,
	"metric_value" numeric(14, 4) DEFAULT '0' NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_customer_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text NOT NULL,
	"preference_key" text NOT NULL,
	"preference_value" text
);
--> statement-breakpoint
CREATE TABLE "crm_customer_product_interests" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"product_type" text NOT NULL,
	"product_id" text,
	"interest_score" integer DEFAULT 0 NOT NULL,
	"interest_notes" text
);
--> statement-breakpoint
CREATE TABLE "crm_customer_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text NOT NULL,
	"tag_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"location" text,
	"lifecycle_stage" text DEFAULT 'lead' NOT NULL,
	"customer_type" text DEFAULT 'unknown' NOT NULL,
	"marketing_consent_status" text DEFAULT 'unknown' NOT NULL,
	"lifetime_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"average_order_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"last_order_at" timestamp with time zone,
	"last_interaction_at" timestamp with time zone,
	"next_action" text,
	"assigned_owner_id" text,
	"profile_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"opportunity_id" text,
	"title" text NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"estimated_value" numeric(12, 2),
	"next_action" text
);
--> statement-breakpoint
CREATE TABLE "crm_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"event_type" text NOT NULL,
	"event_name" text NOT NULL,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"properties_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_feature_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"flag_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "crm_form_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"form_id" text,
	"customer_id" text,
	"lead_id" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"consent_status" text DEFAULT 'unknown' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"fields_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"target_segment_key" text,
	"suggested_follow_up_task" text,
	"consent_language" text,
	"embed_readiness_status" text DEFAULT 'future_integration' NOT NULL,
	"public_form_id" text
);
--> statement-breakpoint
CREATE TABLE "crm_help_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"body" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"import_type" text NOT NULL,
	"records_total" integer DEFAULT 0 NOT NULL,
	"records_imported" integer DEFAULT 0 NOT NULL,
	"sanitized_error" text
);
--> statement-breakpoint
CREATE TABLE "crm_inbox_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"channel_type" text NOT NULL,
	"display_name" text NOT NULL,
	"setup_status" text DEFAULT 'not_configured' NOT NULL,
	"configuration_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_interactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"interaction_type" text NOT NULL,
	"channel" text DEFAULT 'manual' NOT NULL,
	"direction" text DEFAULT 'internal' NOT NULL,
	"subject" text,
	"body" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_landing_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"target_segment_id" text,
	"page_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"interest" text,
	"estimated_value" numeric(12, 2),
	"assigned_segment" text,
	"next_follow_up_at" timestamp with time zone,
	"consent_status" text DEFAULT 'unknown' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "crm_message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'customer_success' NOT NULL,
	"subject" text,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_next_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"action_type" text NOT NULL,
	"title" text NOT NULL,
	"reason" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"due_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crm_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"lead_id" text,
	"title" text NOT NULL,
	"stage" text DEFAULT 'new' NOT NULL,
	"estimated_value" numeric(12, 2),
	"expected_close_date" timestamp with time zone,
	"product_interest" text,
	"next_action" text
);
--> statement-breakpoint
CREATE TABLE "crm_person_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"person_key" text NOT NULL,
	"customer_id" text,
	"event_type" text NOT NULL,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"properties_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_pipeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"pipeline_key" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"lead_id" text,
	"title" text NOT NULL,
	"estimated_value" numeric(12, 2),
	"request_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_recommendation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"recommendation_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_service_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"subject" text NOT NULL,
	"issue_type" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"channel" text DEFAULT 'manual' NOT NULL,
	"assigned_owner_id" text,
	"resolution_notes" text
);
--> statement-breakpoint
CREATE TABLE "crm_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source_key" text NOT NULL,
	"display_name" text NOT NULL,
	"category" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_support_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"conversation_id" text,
	"subject" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"resolution_notes" text
);
--> statement-breakpoint
CREATE TABLE "crm_survey_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"survey_id" text,
	"customer_id" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answers_json" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"questions_json" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_sync_state" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"provider_key" text NOT NULL,
	"sync_type" text NOT NULL,
	"last_cursor" text,
	"last_synced_at" timestamp with time zone,
	"sanitized_error" text
);
--> statement-breakpoint
CREATE TABLE "crm_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"category" text DEFAULT 'customer' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_task_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"trigger_key" text,
	"default_priority" text DEFAULT 'normal' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assigned_owner_id" text
);
--> statement-breakpoint
CREATE TABLE "crm_timeline_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_record_id" text,
	"ai_suggested" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_unsubscribe_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text,
	"created_by" text,
	"updated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_label" text DEFAULT 'manual_entry' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"customer_id" text,
	"email" text,
	"channel" text DEFAULT 'email' NOT NULL,
	"unsubscribed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "crm_addresses" ADD CONSTRAINT "crm_addresses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_addresses" ADD CONSTRAINT "crm_addresses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_addresses" ADD CONSTRAINT "crm_addresses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_addresses" ADD CONSTRAINT "crm_addresses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_addresses" ADD CONSTRAINT "crm_addresses_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_ai_insights" ADD CONSTRAINT "crm_ai_insights_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_ai_insights" ADD CONSTRAINT "crm_ai_insights_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_ai_insights" ADD CONSTRAINT "crm_ai_insights_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_ai_insights" ADD CONSTRAINT "crm_ai_insights_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_ai_insights" ADD CONSTRAINT "crm_ai_insights_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_appointment_types" ADD CONSTRAINT "crm_appointment_types_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_appointment_types" ADD CONSTRAINT "crm_appointment_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_appointment_types" ADD CONSTRAINT "crm_appointment_types_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_appointment_types" ADD CONSTRAINT "crm_appointment_types_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_rules" ADD CONSTRAINT "crm_automation_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_rules" ADD CONSTRAINT "crm_automation_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_rules" ADD CONSTRAINT "crm_automation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_rules" ADD CONSTRAINT "crm_automation_rules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_runs" ADD CONSTRAINT "crm_automation_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_runs" ADD CONSTRAINT "crm_automation_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_runs" ADD CONSTRAINT "crm_automation_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_runs" ADD CONSTRAINT "crm_automation_runs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_automation_runs" ADD CONSTRAINT "crm_automation_runs_automation_rule_id_crm_automation_rules_id_fk" FOREIGN KEY ("automation_rule_id") REFERENCES "public"."crm_automation_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_availability_readiness" ADD CONSTRAINT "crm_availability_readiness_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_availability_readiness" ADD CONSTRAINT "crm_availability_readiness_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_availability_readiness" ADD CONSTRAINT "crm_availability_readiness_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_availability_readiness" ADD CONSTRAINT "crm_availability_readiness_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavior_segments" ADD CONSTRAINT "crm_behavior_segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavior_segments" ADD CONSTRAINT "crm_behavior_segments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavior_segments" ADD CONSTRAINT "crm_behavior_segments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavior_segments" ADD CONSTRAINT "crm_behavior_segments_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavioral_traits" ADD CONSTRAINT "crm_behavioral_traits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavioral_traits" ADD CONSTRAINT "crm_behavioral_traits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavioral_traits" ADD CONSTRAINT "crm_behavioral_traits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavioral_traits" ADD CONSTRAINT "crm_behavioral_traits_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_behavioral_traits" ADD CONSTRAINT "crm_behavioral_traits_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_booking_requests" ADD CONSTRAINT "crm_booking_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_booking_requests" ADD CONSTRAINT "crm_booking_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_booking_requests" ADD CONSTRAINT "crm_booking_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_booking_requests" ADD CONSTRAINT "crm_booking_requests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_booking_requests" ADD CONSTRAINT "crm_booking_requests_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_booking_requests" ADD CONSTRAINT "crm_booking_requests_appointment_type_id_crm_appointment_types_id_fk" FOREIGN KEY ("appointment_type_id") REFERENCES "public"."crm_appointment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaign_members" ADD CONSTRAINT "crm_campaign_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaign_members" ADD CONSTRAINT "crm_campaign_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaign_members" ADD CONSTRAINT "crm_campaign_members_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaign_members" ADD CONSTRAINT "crm_campaign_members_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaign_members" ADD CONSTRAINT "crm_campaign_members_campaign_id_crm_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crm_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaign_members" ADD CONSTRAINT "crm_campaign_members_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaign_members" ADD CONSTRAINT "crm_campaign_members_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consents" ADD CONSTRAINT "crm_consents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consents" ADD CONSTRAINT "crm_consents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consents" ADD CONSTRAINT "crm_consents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consents" ADD CONSTRAINT "crm_consents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consents" ADD CONSTRAINT "crm_consents_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consultations" ADD CONSTRAINT "crm_consultations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consultations" ADD CONSTRAINT "crm_consultations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consultations" ADD CONSTRAINT "crm_consultations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consultations" ADD CONSTRAINT "crm_consultations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consultations" ADD CONSTRAINT "crm_consultations_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_consultations" ADD CONSTRAINT "crm_consultations_appointment_type_id_crm_appointment_types_id_fk" FOREIGN KEY ("appointment_type_id") REFERENCES "public"."crm_appointment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_methods" ADD CONSTRAINT "crm_contact_methods_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_methods" ADD CONSTRAINT "crm_contact_methods_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_methods" ADD CONSTRAINT "crm_contact_methods_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_methods" ADD CONSTRAINT "crm_contact_methods_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_contact_methods" ADD CONSTRAINT "crm_contact_methods_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversation_messages" ADD CONSTRAINT "crm_conversation_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversation_messages" ADD CONSTRAINT "crm_conversation_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversation_messages" ADD CONSTRAINT "crm_conversation_messages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversation_messages" ADD CONSTRAINT "crm_conversation_messages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversation_messages" ADD CONSTRAINT "crm_conversation_messages_conversation_id_crm_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."crm_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversation_messages" ADD CONSTRAINT "crm_conversation_messages_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_conversations" ADD CONSTRAINT "crm_conversations_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_cohorts" ADD CONSTRAINT "crm_customer_cohorts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_cohorts" ADD CONSTRAINT "crm_customer_cohorts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_cohorts" ADD CONSTRAINT "crm_customer_cohorts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_cohorts" ADD CONSTRAINT "crm_customer_cohorts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_external_refs" ADD CONSTRAINT "crm_customer_external_refs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_external_refs" ADD CONSTRAINT "crm_customer_external_refs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_external_refs" ADD CONSTRAINT "crm_customer_external_refs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_external_refs" ADD CONSTRAINT "crm_customer_external_refs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_external_refs" ADD CONSTRAINT "crm_customer_external_refs_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_metrics" ADD CONSTRAINT "crm_customer_metrics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_metrics" ADD CONSTRAINT "crm_customer_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_metrics" ADD CONSTRAINT "crm_customer_metrics_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_metrics" ADD CONSTRAINT "crm_customer_metrics_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_metrics" ADD CONSTRAINT "crm_customer_metrics_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_preferences" ADD CONSTRAINT "crm_customer_preferences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_preferences" ADD CONSTRAINT "crm_customer_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_preferences" ADD CONSTRAINT "crm_customer_preferences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_preferences" ADD CONSTRAINT "crm_customer_preferences_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_preferences" ADD CONSTRAINT "crm_customer_preferences_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_product_interests" ADD CONSTRAINT "crm_customer_product_interests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_product_interests" ADD CONSTRAINT "crm_customer_product_interests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_product_interests" ADD CONSTRAINT "crm_customer_product_interests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_product_interests" ADD CONSTRAINT "crm_customer_product_interests_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_product_interests" ADD CONSTRAINT "crm_customer_product_interests_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_tags" ADD CONSTRAINT "crm_customer_tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_tags" ADD CONSTRAINT "crm_customer_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_tags" ADD CONSTRAINT "crm_customer_tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_tags" ADD CONSTRAINT "crm_customer_tags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_tags" ADD CONSTRAINT "crm_customer_tags_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customer_tags" ADD CONSTRAINT "crm_customer_tags_tag_id_crm_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."crm_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_customers" ADD CONSTRAINT "crm_customers_assigned_owner_id_users_id_fk" FOREIGN KEY ("assigned_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_opportunity_id_crm_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."crm_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_events" ADD CONSTRAINT "crm_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_events" ADD CONSTRAINT "crm_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_events" ADD CONSTRAINT "crm_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_events" ADD CONSTRAINT "crm_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_events" ADD CONSTRAINT "crm_events_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_feature_flags" ADD CONSTRAINT "crm_feature_flags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_feature_flags" ADD CONSTRAINT "crm_feature_flags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_feature_flags" ADD CONSTRAINT "crm_feature_flags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_feature_flags" ADD CONSTRAINT "crm_feature_flags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_form_submissions" ADD CONSTRAINT "crm_form_submissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_form_submissions" ADD CONSTRAINT "crm_form_submissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_form_submissions" ADD CONSTRAINT "crm_form_submissions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_form_submissions" ADD CONSTRAINT "crm_form_submissions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_form_submissions" ADD CONSTRAINT "crm_form_submissions_form_id_crm_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."crm_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_form_submissions" ADD CONSTRAINT "crm_form_submissions_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_form_submissions" ADD CONSTRAINT "crm_form_submissions_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_forms" ADD CONSTRAINT "crm_forms_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_forms" ADD CONSTRAINT "crm_forms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_forms" ADD CONSTRAINT "crm_forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_forms" ADD CONSTRAINT "crm_forms_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_help_topics" ADD CONSTRAINT "crm_help_topics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_help_topics" ADD CONSTRAINT "crm_help_topics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_help_topics" ADD CONSTRAINT "crm_help_topics_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_help_topics" ADD CONSTRAINT "crm_help_topics_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_import_batches" ADD CONSTRAINT "crm_import_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_import_batches" ADD CONSTRAINT "crm_import_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_import_batches" ADD CONSTRAINT "crm_import_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_import_batches" ADD CONSTRAINT "crm_import_batches_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_inbox_channels" ADD CONSTRAINT "crm_inbox_channels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_inbox_channels" ADD CONSTRAINT "crm_inbox_channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_inbox_channels" ADD CONSTRAINT "crm_inbox_channels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_inbox_channels" ADD CONSTRAINT "crm_inbox_channels_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_interactions" ADD CONSTRAINT "crm_interactions_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_landing_pages" ADD CONSTRAINT "crm_landing_pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_landing_pages" ADD CONSTRAINT "crm_landing_pages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_landing_pages" ADD CONSTRAINT "crm_landing_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_landing_pages" ADD CONSTRAINT "crm_landing_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_message_templates" ADD CONSTRAINT "crm_message_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_message_templates" ADD CONSTRAINT "crm_message_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_message_templates" ADD CONSTRAINT "crm_message_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_message_templates" ADD CONSTRAINT "crm_message_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_next_actions" ADD CONSTRAINT "crm_next_actions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_next_actions" ADD CONSTRAINT "crm_next_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_next_actions" ADD CONSTRAINT "crm_next_actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_next_actions" ADD CONSTRAINT "crm_next_actions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_next_actions" ADD CONSTRAINT "crm_next_actions_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_opportunities" ADD CONSTRAINT "crm_opportunities_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_person_events" ADD CONSTRAINT "crm_person_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_person_events" ADD CONSTRAINT "crm_person_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_person_events" ADD CONSTRAINT "crm_person_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_person_events" ADD CONSTRAINT "crm_person_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_person_events" ADD CONSTRAINT "crm_person_events_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_pipeline_stages" ADD CONSTRAINT "crm_pipeline_stages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_recommendation_events" ADD CONSTRAINT "crm_recommendation_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_recommendation_events" ADD CONSTRAINT "crm_recommendation_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_recommendation_events" ADD CONSTRAINT "crm_recommendation_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_recommendation_events" ADD CONSTRAINT "crm_recommendation_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_recommendation_events" ADD CONSTRAINT "crm_recommendation_events_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_cases" ADD CONSTRAINT "crm_service_cases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_cases" ADD CONSTRAINT "crm_service_cases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_cases" ADD CONSTRAINT "crm_service_cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_cases" ADD CONSTRAINT "crm_service_cases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_cases" ADD CONSTRAINT "crm_service_cases_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_service_cases" ADD CONSTRAINT "crm_service_cases_assigned_owner_id_users_id_fk" FOREIGN KEY ("assigned_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sources" ADD CONSTRAINT "crm_sources_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sources" ADD CONSTRAINT "crm_sources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sources" ADD CONSTRAINT "crm_sources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sources" ADD CONSTRAINT "crm_sources_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_support_cases" ADD CONSTRAINT "crm_support_cases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_support_cases" ADD CONSTRAINT "crm_support_cases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_support_cases" ADD CONSTRAINT "crm_support_cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_support_cases" ADD CONSTRAINT "crm_support_cases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_support_cases" ADD CONSTRAINT "crm_support_cases_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_support_cases" ADD CONSTRAINT "crm_support_cases_conversation_id_crm_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."crm_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_survey_responses" ADD CONSTRAINT "crm_survey_responses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_survey_responses" ADD CONSTRAINT "crm_survey_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_survey_responses" ADD CONSTRAINT "crm_survey_responses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_survey_responses" ADD CONSTRAINT "crm_survey_responses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_survey_responses" ADD CONSTRAINT "crm_survey_responses_survey_id_crm_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."crm_surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_survey_responses" ADD CONSTRAINT "crm_survey_responses_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_surveys" ADD CONSTRAINT "crm_surveys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_surveys" ADD CONSTRAINT "crm_surveys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_surveys" ADD CONSTRAINT "crm_surveys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_surveys" ADD CONSTRAINT "crm_surveys_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_state" ADD CONSTRAINT "crm_sync_state_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_state" ADD CONSTRAINT "crm_sync_state_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_state" ADD CONSTRAINT "crm_sync_state_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_state" ADD CONSTRAINT "crm_sync_state_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tags" ADD CONSTRAINT "crm_tags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task_templates" ADD CONSTRAINT "crm_task_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task_templates" ADD CONSTRAINT "crm_task_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task_templates" ADD CONSTRAINT "crm_task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_task_templates" ADD CONSTRAINT "crm_task_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assigned_owner_id_users_id_fk" FOREIGN KEY ("assigned_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_timeline_events" ADD CONSTRAINT "crm_timeline_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_timeline_events" ADD CONSTRAINT "crm_timeline_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_timeline_events" ADD CONSTRAINT "crm_timeline_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_timeline_events" ADD CONSTRAINT "crm_timeline_events_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_timeline_events" ADD CONSTRAINT "crm_timeline_events_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_unsubscribe_preferences" ADD CONSTRAINT "crm_unsubscribe_preferences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_unsubscribe_preferences" ADD CONSTRAINT "crm_unsubscribe_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_unsubscribe_preferences" ADD CONSTRAINT "crm_unsubscribe_preferences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_unsubscribe_preferences" ADD CONSTRAINT "crm_unsubscribe_preferences_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_unsubscribe_preferences" ADD CONSTRAINT "crm_unsubscribe_preferences_customer_id_crm_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."crm_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crm_addresses_customer_idx" ON "crm_addresses" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_ai_insights_customer_idx" ON "crm_ai_insights" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_appointment_types_name_idx" ON "crm_appointment_types" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "crm_automation_rules_trigger_idx" ON "crm_automation_rules" USING btree ("workspace_id","trigger_key");--> statement-breakpoint
CREATE INDEX "crm_automation_runs_rule_idx" ON "crm_automation_runs" USING btree ("workspace_id","automation_rule_id");--> statement-breakpoint
CREATE INDEX "crm_availability_readiness_provider_idx" ON "crm_availability_readiness" USING btree ("workspace_id","calendar_provider");--> statement-breakpoint
CREATE INDEX "crm_behavior_segments_name_idx" ON "crm_behavior_segments" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "crm_behavioral_traits_customer_idx" ON "crm_behavioral_traits" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_booking_requests_status_idx" ON "crm_booking_requests" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_campaign_members_campaign_idx" ON "crm_campaign_members" USING btree ("workspace_id","campaign_id");--> statement-breakpoint
CREATE INDEX "crm_campaigns_status_idx" ON "crm_campaigns" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_companies_workspace_name_idx" ON "crm_companies" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "crm_companies_status_idx" ON "crm_companies" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_consents_customer_idx" ON "crm_consents" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_consents_email_idx" ON "crm_consents" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "crm_consultations_status_idx" ON "crm_consultations" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_contact_methods_customer_idx" ON "crm_contact_methods" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_contact_methods_value_idx" ON "crm_contact_methods" USING btree ("workspace_id","value");--> statement-breakpoint
CREATE INDEX "crm_conversation_messages_conversation_idx" ON "crm_conversation_messages" USING btree ("workspace_id","conversation_id");--> statement-breakpoint
CREATE INDEX "crm_conversations_status_idx" ON "crm_conversations" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_conversations_customer_idx" ON "crm_conversations" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_customer_cohorts_name_idx" ON "crm_customer_cohorts" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "crm_customer_cohorts_status_idx" ON "crm_customer_cohorts" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_customer_external_refs_unique" ON "crm_customer_external_refs" USING btree ("workspace_id","provider_key","external_id");--> statement-breakpoint
CREATE INDEX "crm_customer_external_refs_customer_idx" ON "crm_customer_external_refs" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_customer_metrics_metric_idx" ON "crm_customer_metrics" USING btree ("workspace_id","customer_id","metric_key");--> statement-breakpoint
CREATE INDEX "crm_customer_preferences_customer_idx" ON "crm_customer_preferences" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_customer_product_interests_customer_idx" ON "crm_customer_product_interests" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_customer_product_interests_type_idx" ON "crm_customer_product_interests" USING btree ("workspace_id","product_type");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_customer_tags_unique" ON "crm_customer_tags" USING btree ("workspace_id","customer_id","tag_id");--> statement-breakpoint
CREATE INDEX "crm_customer_tags_customer_idx" ON "crm_customer_tags" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_customers_workspace_email_idx" ON "crm_customers" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "crm_customers_workspace_status_idx" ON "crm_customers" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_customers_source_idx" ON "crm_customers" USING btree ("workspace_id","source_label");--> statement-breakpoint
CREATE INDEX "crm_customers_lifecycle_idx" ON "crm_customers" USING btree ("workspace_id","lifecycle_stage");--> statement-breakpoint
CREATE INDEX "crm_deals_stage_idx" ON "crm_deals" USING btree ("workspace_id","stage");--> statement-breakpoint
CREATE INDEX "crm_events_type_idx" ON "crm_events" USING btree ("workspace_id","event_type","event_at");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_feature_flags_unique" ON "crm_feature_flags" USING btree ("workspace_id","flag_key");--> statement-breakpoint
CREATE INDEX "crm_form_submissions_form_idx" ON "crm_form_submissions" USING btree ("workspace_id","form_id");--> statement-breakpoint
CREATE INDEX "crm_forms_public_form_idx" ON "crm_forms" USING btree ("workspace_id","public_form_id");--> statement-breakpoint
CREATE INDEX "crm_forms_status_idx" ON "crm_forms" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_help_topics_slug_unique" ON "crm_help_topics" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "crm_import_batches_status_idx" ON "crm_import_batches" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_inbox_channels_unique" ON "crm_inbox_channels" USING btree ("workspace_id","channel_type");--> statement-breakpoint
CREATE INDEX "crm_interactions_customer_idx" ON "crm_interactions" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_landing_pages_slug_unique" ON "crm_landing_pages" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "crm_leads_email_idx" ON "crm_leads" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "crm_leads_status_idx" ON "crm_leads" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_message_templates_category_idx" ON "crm_message_templates" USING btree ("workspace_id","category");--> statement-breakpoint
CREATE INDEX "crm_next_actions_customer_idx" ON "crm_next_actions" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_next_actions_status_idx" ON "crm_next_actions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_notes_customer_idx" ON "crm_notes" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_opportunities_stage_idx" ON "crm_opportunities" USING btree ("workspace_id","stage");--> statement-breakpoint
CREATE INDEX "crm_person_events_person_idx" ON "crm_person_events" USING btree ("workspace_id","person_key");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_pipeline_stages_unique" ON "crm_pipeline_stages" USING btree ("workspace_id","pipeline_key","name");--> statement-breakpoint
CREATE INDEX "crm_quotes_status_idx" ON "crm_quotes" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_recommendation_events_customer_idx" ON "crm_recommendation_events" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_service_cases_customer_idx" ON "crm_service_cases" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_service_cases_status_idx" ON "crm_service_cases" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_sources_workspace_key_unique" ON "crm_sources" USING btree ("workspace_id","source_key");--> statement-breakpoint
CREATE INDEX "crm_support_cases_status_idx" ON "crm_support_cases" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "crm_survey_responses_survey_idx" ON "crm_survey_responses" USING btree ("workspace_id","survey_id");--> statement-breakpoint
CREATE INDEX "crm_surveys_status_idx" ON "crm_surveys" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_sync_state_unique" ON "crm_sync_state" USING btree ("workspace_id","provider_key","sync_type");--> statement-breakpoint
CREATE UNIQUE INDEX "crm_tags_workspace_name_unique" ON "crm_tags" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE INDEX "crm_tags_category_idx" ON "crm_tags" USING btree ("workspace_id","category");--> statement-breakpoint
CREATE INDEX "crm_task_templates_trigger_idx" ON "crm_task_templates" USING btree ("workspace_id","trigger_key");--> statement-breakpoint
CREATE INDEX "crm_tasks_due_status_idx" ON "crm_tasks" USING btree ("workspace_id","status","due_at");--> statement-breakpoint
CREATE INDEX "crm_tasks_customer_idx" ON "crm_tasks" USING btree ("workspace_id","customer_id");--> statement-breakpoint
CREATE INDEX "crm_timeline_events_customer_time_idx" ON "crm_timeline_events" USING btree ("workspace_id","customer_id","event_at");--> statement-breakpoint
CREATE INDEX "crm_timeline_events_type_idx" ON "crm_timeline_events" USING btree ("workspace_id","event_type");--> statement-breakpoint
CREATE INDEX "crm_unsubscribe_preferences_email_idx" ON "crm_unsubscribe_preferences" USING btree ("workspace_id","email");