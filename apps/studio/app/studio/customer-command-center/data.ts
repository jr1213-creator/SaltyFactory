import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
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
import { classifyStudioDataError, studioWorkspaceId } from "../data";

const setupMessages: Record<string, string> = {
  schema_incomplete: "Database schema incomplete. Apply migrations to enable this feature.",
  database_not_configured: "Studio database is not configured. Set DATABASE_URL for the Studio runtime.",
  database_unreachable: "Studio database is configured but unreachable.",
  database_permission_denied: "Studio database access is blocked.",
  workspace_setup_required: "Studio workspace setup is incomplete.",
  data_unavailable: "Customer Command Center data is unavailable. Check database access and workspace setup."
};

export function safeCrmRow<T extends WorkspaceRow | Record<string, unknown>>(row: T): T | { id?: unknown; status?: unknown; source_label?: unknown; workspace_id?: unknown } {
  if (customerRecordIsSafeForClient(row as Record<string, unknown>)) return row;
  return {
    id: row.id,
    status: row.status,
    source_label: row.source_label ?? row.sourceLabel,
    workspace_id: row.workspace_id ?? row.workspaceId
  };
}

function providerStatus(connections: WorkspaceRow[], providerKey: string) {
  const row = connections.find((connection) =>
    connection.provider_key === providerKey ||
    connection.providerKey === providerKey ||
    connection.provider_type === providerKey ||
    connection.providerType === providerKey
  );
  return String(row?.status ?? "not_configured");
}

function segmentReadiness(segment: (typeof defaultCrmSegments)[number]) {
  const required = segment.sourceDataRequired as readonly string[];
  if (required.includes("shopify_customer_order_sync")) return "Needs Shopify/customer event data";
  if (required.includes("shopify_cart_event_integration")) return "Needs Shopify/cart event data";
  if (required.includes("forms_or_customer_events")) return "Needs forms or customer event data";
  return "Ready for manual or imported records";
}

function customerName(customer: WorkspaceRow) {
  return String(customer.name ?? customer.email ?? customer.phone ?? "Unnamed customer");
}

const defaultSegmentRows = () => defaultCrmSegments.map((segment) => ({
  id: `default_${segment.key}`,
  key: segment.key,
  name: segment.name,
  description: segment.description,
  rule: segment.sourceDataRequired.join(", "),
  readiness: segmentReadiness(segment),
  memberCount: 0,
  suggestedAction: segment.suggestedAction,
  sourceLabel: "System-generated",
  status: "active"
}));

const defaultCaptureFormRows = () => defaultCrmCaptureForms.map(([key, title, description]) => ({
  key,
  title,
  description,
  fields: ["name", "email", "phone", "interest", "consent"],
  sourceLabel: "System-generated",
  status: "draft",
  embedReadinessStatus: "future_integration"
}));

function emptyCustomerCommandCenterState(setupKind = "", setupMessage = "") {
  return {
    setupMessage,
    setupKind,
    customers: [] as WorkspaceRow[],
    leads: [] as WorkspaceRow[],
    tasks: [] as WorkspaceRow[],
    notes: [] as WorkspaceRow[],
    timelineEvents: [] as WorkspaceRow[],
    segments: defaultSegmentRows(),
    defaultSegments: defaultSegmentRows(),
    forms: [] as WorkspaceRow[],
    campaigns: [] as WorkspaceRow[],
    conversations: [] as WorkspaceRow[],
    consultations: [] as WorkspaceRow[],
    events: [] as WorkspaceRow[],
    productInterests: [] as WorkspaceRow[],
    externalRefs: [] as WorkspaceRow[],
    consents: [] as WorkspaceRow[],
    defaultTaskTemplates: defaultCrmTaskTemplates,
    defaultCaptureForms: defaultCaptureFormRows(),
    defaultMessageTemplates: defaultCrmMessageTemplates,
    defaultCampaignIdeas: defaultCrmCampaignIdeas,
    defaultAppointmentTypes: defaultCrmAppointmentTypes,
    summary: createCustomerCommandCenterSummary({
      segments: defaultSegmentRows(),
      forms: [],
      shopifyStatus: "not_configured"
    }),
    nextActions: [] as Array<Record<string, unknown>>,
    providerStatuses: { shopify: "not_configured" },
    sourceLabelFor: customerSourceLabel
  };
}

export async function getCustomerCommandCenterData() {
  const memoryAllowed = process.env.NODE_ENV === "test" || process.env.REPOSITORY_ADAPTER === "memory";
  if (!process.env.DATABASE_URL && !memoryAllowed) {
    return {
      ...emptyCustomerCommandCenterState("database_not_configured", setupMessages.database_not_configured),
      ok: false as const,
    };
  }

  try {
    const repos = createRepositories();
    const [
      customers,
      leads,
      tasks,
      notes,
      timelineEvents,
      persistedSegments,
      forms,
      campaigns,
      conversations,
      consultations,
      events,
      productInterests,
      serviceCases,
      externalRefs,
      consents,
      providerConnections
    ] = await Promise.all([
      repos.crm.customers.listByWorkspace(studioWorkspaceId),
      repos.crm.leads.listByWorkspace(studioWorkspaceId),
      repos.crm.tasks.listByWorkspace(studioWorkspaceId),
      repos.crm.notes.listByWorkspace(studioWorkspaceId),
      repos.crm.timelineEvents.listByWorkspace(studioWorkspaceId),
      repos.crm.customerCohorts.listByWorkspace(studioWorkspaceId),
      repos.crm.forms.listByWorkspace(studioWorkspaceId),
      repos.crm.campaigns.listByWorkspace(studioWorkspaceId),
      repos.crm.conversations.listByWorkspace(studioWorkspaceId),
      repos.crm.consultations.listByWorkspace(studioWorkspaceId),
      repos.crm.events.listByWorkspace(studioWorkspaceId),
      repos.crm.productInterests.listByWorkspace(studioWorkspaceId),
      repos.crm.serviceCases.listByWorkspace(studioWorkspaceId),
      repos.crm.externalRefs.listByWorkspace(studioWorkspaceId),
      repos.crm.consents.listByWorkspace(studioWorkspaceId),
      repos.integration.listProviderConnectionsForWorkspace(studioWorkspaceId)
    ]);
    const shopifyStatus = providerStatus(providerConnections, "shopify");
    const summary = createCustomerCommandCenterSummary({
      customers,
      leads,
      tasks,
      segments: persistedSegments.length ? persistedSegments : defaultCrmSegments as unknown as Array<Record<string, unknown>>,
      forms,
      campaigns,
      conversations,
      consultations,
      events,
      shopifyStatus
    });
    const defaultSegments = defaultSegmentRows();
    const nextActions = customers.flatMap((customer) => {
      const customerId = String(customer.id);
      const customerInterests = productInterests.filter((interest) => String(interest.customer_id ?? interest.customerId ?? "") === customerId);
      const openCases = serviceCases.filter((item) => String(item.customer_id ?? item.customerId ?? "") === customerId && String(item.status ?? "open") !== "closed").length;
      return deriveCustomerNextActions({
        customer,
        openSupportCases: openCases,
        productInterests: customerInterests,
        abandonedCartEventsAvailable: events.some((event) => String(event.event_type ?? event.eventType ?? "") === "add_to_cart")
      }).map((action) => ({
        id: `next_${customerId}_${action.actionType}`,
        customerId,
        customerName: customerName(customer),
        ...action
      }));
    });

    return {
      ok: true as const,
      setupMessage: "",
      setupKind: "",
      customers: customers.map(safeCrmRow),
      leads: leads.map(safeCrmRow),
      tasks: tasks.map(safeCrmRow),
      notes: notes.map(safeCrmRow),
      timelineEvents: sortCustomerTimeline(timelineEvents).map(safeCrmRow),
      segments: persistedSegments.length ? persistedSegments.map(safeCrmRow) : defaultSegments,
      defaultSegments,
      forms: forms.map(safeCrmRow),
      campaigns: campaigns.map(safeCrmRow),
      conversations: conversations.map(safeCrmRow),
      consultations: consultations.map(safeCrmRow),
      events: events.map(safeCrmRow),
      productInterests: productInterests.map(safeCrmRow),
      externalRefs: externalRefs.map(safeCrmRow),
      consents: consents.map(safeCrmRow),
      defaultTaskTemplates: defaultCrmTaskTemplates,
      defaultCaptureForms: defaultCaptureFormRows(),
      defaultMessageTemplates: defaultCrmMessageTemplates,
      defaultCampaignIdeas: defaultCrmCampaignIdeas,
      defaultAppointmentTypes: defaultCrmAppointmentTypes,
      summary,
      nextActions,
      providerStatuses: { shopify: shopifyStatus },
      sourceLabelFor: customerSourceLabel
    };
  } catch (error) {
    const setupKind = classifyStudioDataError(error);
    return {
      ...emptyCustomerCommandCenterState(setupKind, setupMessages[setupKind] ?? setupMessages.data_unavailable),
      ok: false as const,
    };
  }
}

export type CustomerCommandCenterData = Awaited<ReturnType<typeof getCustomerCommandCenterData>>;
