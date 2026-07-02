import { describe, expect, it } from "vitest";
import {
  createCustomerCommandCenterSummary,
  customerRecordIsSafeForClient,
  customerSourceLabel,
  defaultCrmAppointmentTypes,
  defaultCrmCampaignIdeas,
  defaultCrmCaptureForms,
  defaultCrmMessageTemplates,
  defaultCrmSegments,
  defaultCrmTaskTemplates,
  deriveCustomerNextActions,
  sortCustomerTimeline
} from "@saltyfactory/domain";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { customerCommandCenterTables, requiredStudioTables } from "../packages/db/src/apply-local";

const workspaceId = "wks_default";

describe("Customer Command Center domain foundation", () => {
  it("defines default segments, task templates, capture forms, messages, campaigns, and appointments", () => {
    expect(defaultCrmSegments.map((segment) => segment.name)).toEqual(expect.arrayContaining(["New Customers", "VIP Customers", "Abandoned Cart Candidates", "No Purchase Yet"]));
    expect(defaultCrmTaskTemplates.map((template) => template.title)).toContain("Send thank-you message");
    expect(defaultCrmCaptureForms.map(([, title]) => title)).toContain("Wholesale inquiry form");
    expect(defaultCrmMessageTemplates.map((template) => template.name)).toContain("review request");
    expect(defaultCrmCampaignIdeas.map((campaign) => campaign.name)).toContain("Reactivation campaign");
    expect(defaultCrmAppointmentTypes.map((type) => type.name)).toContain("Custom order consultation");
  });

  it("creates deterministic next actions without abandoned-cart suggestions when cart data is absent", () => {
    const actions = deriveCustomerNextActions({
      customer: {
        id: "cust_1",
        name: "Taylor",
        lifecycle_stage: "lead",
        marketing_consent_status: "unknown",
        order_count: 0,
        profile_json: { wholesaleLead: true, customOrderInterest: true }
      },
      segmentKeys: [],
      abandonedCartEventsAvailable: false
    });
    expect(actions.map((action) => action.title)).toEqual(expect.arrayContaining([
      "Add contact details.",
      "Assign a customer segment.",
      "Create custom order follow-up task.",
      "Ask about boutique inventory needs.",
      "Request/confirm marketing consent before campaign enrollment.",
      "Send first-purchase offer or product recommendation."
    ]));
    expect(actions.map((action) => action.actionType)).not.toContain("abandoned_cart_review");
    expect(actions.every((action) => action.sourceLabel === "rules_based_ai_suggestion")).toBe(true);
  });

  it("sorts customer timeline chronologically with newest first", () => {
    const sorted = sortCustomerTimeline([
      { id: "old", event_at: "2026-01-01T00:00:00Z", title: "Old" },
      { id: "new", event_at: "2026-02-01T00:00:00Z", title: "New" }
    ]);
    expect(sorted.map((event) => event.id)).toEqual(["new", "old"]);
  });

  it("summarizes readiness honestly without fake customers, campaigns, support, or analytics", () => {
    const summary = createCustomerCommandCenterSummary({ customers: [], leads: [], events: [], shopifyStatus: "not_configured" });
    expect(summary.emptyState).toBe(true);
    expect(summary.customerCount).toBe(0);
    expect(summary.customerIntelligenceReadiness).toBe("not_configured");
    expect(summary.campaignsActivePlaceholder).toBe(0);
    expect(summary.blockerCards.map((card) => card.status)).toEqual(expect.arrayContaining(["needs_owner_action", "not_configured", "setup_needed"]));
  });

  it("labels source-of-truth values and rejects token-shaped rows for client serialization", () => {
    expect(customerSourceLabel("shopify")).toBe("Shopify");
    expect(customerSourceLabel("rules_based_ai_suggestion")).toBe("Rule-based AI suggestion");
    expect(customerRecordIsSafeForClient({ id: "cust_1", email: "safe@example.com" })).toBe(true);
    expect(customerRecordIsSafeForClient({ id: "cust_1", access_token: "secret" })).toBe(false);
  });

  it("persists CRM rows through the shared repository bundle with workspace isolation", async () => {
    const repos = createMemoryRepositories();
    await repos.crm.customers.create({ id: "cust_1", workspace_id: workspaceId, name: "Jennie", email: "owner@example.com", source_label: "manual_entry" });
    await repos.crm.customers.create({ id: "cust_other", workspace_id: "other", name: "Other", source_label: "manual_entry" });
    await repos.crm.timelineEvents.create({ id: "event_1", workspace_id: workspaceId, customer_id: "cust_1", event_type: "manual_event", title: "Created", source_label: "manual_entry" });
    await repos.crm.tasks.create({ id: "task_1", workspace_id: workspaceId, customer_id: "cust_1", title: "Send thank-you message", status: "open", source_label: "manual_entry" });

    expect(await repos.crm.customers.listByWorkspace(workspaceId)).toHaveLength(1);
    expect(await repos.crm.timelineEvents.listByWorkspace(workspaceId)).toHaveLength(1);
    expect(await repos.crm.tasks.listByWorkspace(workspaceId)).toHaveLength(1);
  });

  it("adds Customer Command Center tables to db:migrate verification", () => {
    expect(customerCommandCenterTables).toEqual(expect.arrayContaining(["crm_customers", "crm_timeline_events", "crm_forms", "crm_campaigns", "crm_events", "crm_appointment_types"]));
    expect(requiredStudioTables).toEqual(expect.arrayContaining(customerCommandCenterTables));
  });
});
