export const customerSourceLabelMap = {
  manual_entry: "Manual entry",
  shopify: "Shopify",
  contact_form: "Contact form",
  launch_waitlist: "Launch waitlist",
  email_import: "Email import",
  chat_support: "Chat/support",
  google_sheet_import: "Google Sheet import",
  csv_import: "CSV import",
  ai_generated_suggestion: "AI-generated suggestion",
  admin_created_note: "Admin-created note",
  system_generated: "System-generated",
  website_event: "Website event",
  campaign: "Campaign",
  scheduling: "Scheduling",
  rules_based_ai_suggestion: "Rule-based AI suggestion"
} as const;

export type CustomerSourceLabel = keyof typeof customerSourceLabelMap;

export type CustomerRowLike = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  source_label?: string | null;
  sourceLabel?: string | null;
  status?: string | null;
  lifecycle_stage?: string | null;
  lifecycleStage?: string | null;
  customer_type?: string | null;
  customerType?: string | null;
  marketing_consent_status?: string | null;
  marketingConsentStatus?: string | null;
  lifetime_value?: string | number | null;
  lifetimeValue?: string | number | null;
  average_order_value?: string | number | null;
  averageOrderValue?: string | number | null;
  order_count?: string | number | null;
  orderCount?: string | number | null;
  last_order_at?: string | Date | null;
  lastOrderAt?: string | Date | null;
  last_interaction_at?: string | Date | null;
  lastInteractionAt?: string | Date | null;
  next_action?: string | null;
  nextAction?: string | null;
  profile_json?: Record<string, unknown> | null;
  profileJson?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type TimelineEventLike = {
  id?: string;
  customer_id?: string | null;
  customerId?: string | null;
  event_type?: string | null;
  eventType?: string | null;
  title?: string | null;
  body?: string | null;
  event_at?: string | Date | null;
  eventAt?: string | Date | null;
  source_label?: string | null;
  sourceLabel?: string | null;
  ai_suggested?: boolean | null;
  aiSuggested?: boolean | null;
};

export const defaultCustomerSegments = [
  { key: "new_customers", name: "New Customers", description: "Customers created recently or in the first lifecycle stage.", sourceDataRequired: ["customer_created"], suggestedAction: "Send a thank-you or welcome follow-up." },
  { key: "repeat_buyers", name: "Repeat Buyers", description: "Customers with more than one completed purchase.", sourceDataRequired: ["shopify_customer_order_sync"], suggestedAction: "Offer coordinated products or bundles." },
  { key: "vip_customers", name: "VIP Customers", description: "High lifetime value or frequent repeat buyers.", sourceDataRequired: ["shopify_customer_order_sync"], suggestedAction: "Invite to VIP list after consent is confirmed." },
  { key: "at_risk_customers", name: "At-Risk Customers", description: "Customers with no recent interaction after prior purchase.", sourceDataRequired: ["shopify_customer_order_sync", "crm_interactions"], suggestedAction: "Create reactivation campaign draft." },
  { key: "high_intent_leads", name: "High Intent Leads", description: "Leads with product interest, consultation request, or multiple tracked events.", sourceDataRequired: ["forms_or_customer_events"], suggestedAction: "Create first-purchase or consultation follow-up." },
  { key: "needs_follow_up", name: "Needs Follow-Up", description: "Open tasks, service issues, or stale lead follow-up dates.", sourceDataRequired: ["crm_tasks"], suggestedAction: "Complete the next follow-up task." },
  { key: "bought_jewelry", name: "Bought Jewelry", description: "Customers with jewelry purchases or jewelry product interest.", sourceDataRequired: ["shopify_customer_order_sync"], suggestedAction: "Invite to jewelry stack promotion." },
  { key: "bought_digital_products", name: "Bought Digital Products", description: "Customers with digital product purchases or product interest.", sourceDataRequired: ["shopify_customer_order_sync"], suggestedAction: "Offer a matching digital bundle." },
  { key: "interested_custom_work", name: "Interested in Custom Work", description: "Customers or leads with custom order request signals.", sourceDataRequired: ["forms_or_manual_tags"], suggestedAction: "Create custom order follow-up task." },
  { key: "wholesale_boutique_leads", name: "Wholesale/Boutique Leads", description: "Boutique, wholesale, or reseller inquiries.", sourceDataRequired: ["forms_or_manual_tags"], suggestedAction: "Ask about boutique inventory needs." },
  { key: "abandoned_cart_candidates", name: "Abandoned Cart Candidates", description: "Cart or checkout activity without purchase.", sourceDataRequired: ["shopify_cart_event_integration"], suggestedAction: "Wait for Shopify/cart event data before using this segment." },
  { key: "holiday_buyers", name: "Holiday Buyers", description: "Customers tied to holiday purchases or holiday product interest.", sourceDataRequired: ["shopify_customer_order_sync", "manual_tags"], suggestedAction: "Add to holiday ornament campaign." },
  { key: "local_customers", name: "Local Customers", description: "Customers identified as local shoppers, pickup, event, or market contacts.", sourceDataRequired: ["manual_tags_or_forms"], suggestedAction: "Offer local pickup/event follow-up if applicable." },
  { key: "no_purchase_yet", name: "No Purchase Yet", description: "Contacts with no confirmed purchases.", sourceDataRequired: ["crm_customers"], suggestedAction: "Send first-purchase offer only after consent is confirmed." }
] as const;
export const defaultCrmSegments = defaultCustomerSegments;

export const defaultCrmTaskTemplates = [
  "Send thank-you message",
  "Ask for review",
  "Follow up on custom order request",
  "Follow up on wholesale inquiry",
  "Invite to VIP list",
  "Send first-purchase offer",
  "Add to holiday campaign",
  "Check unresolved support issue",
  "Send reactivation message",
  "Confirm marketing consent",
  "Schedule consultation",
  "Review high-intent lead"
].map((title, index) => ({
  key: title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  title,
  description: `${title} as an internal owner task. No messages are sent automatically.`,
  triggerKey: title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  defaultPriority: index < 4 ? "high" : "normal",
  sourceLabel: "system_generated"
}));

export const defaultCrmCaptureForms = [
  ["website_lead", "Website lead form", "Capture general website inquiries."],
  ["newsletter_signup", "Newsletter signup", "Invite customers into owned audience updates."],
  ["wholesale_inquiry", "Wholesale inquiry form", "Collect boutique or reseller leads."],
  ["custom_order_request", "Custom order request form", "Gather custom product requests."],
  ["product_interest", "Product interest form", "Capture interest in upcoming POD drops."],
  ["post_purchase_review", "Post-purchase review request", "Prepare review request workflow after orders sync."],
  ["vip_list_signup", "VIP list signup", "Invite loyal customers into VIP launch lists."],
  ["notify_me_drop", "Notify me when this drops", "Capture interest for product drops."],
  ["event_qr_signup", "QR code signup form for in-person events", "Collect event contacts with consent."],
  ["consultation_request", "Consultation request form", "Create consultation request intake."]
] as const;

export const defaultCrmMessageTemplates = [
  "first purchase thank-you",
  "review request",
  "wholesale follow-up",
  "custom order follow-up",
  "VIP invitation",
  "reactivation",
  "holiday drop announcement",
  "jewelry stack promo",
  "digital bundle upsell",
  "support follow-up",
  "appointment confirmation placeholder"
].map((name) => ({
  key: name.replace(/[^a-z0-9]+/g, "_"),
  name,
  subject: name.includes("appointment") ? "Appointment request received" : "A note from Salty Cowhide",
  body: "Draft template only. Review, edit, and send through a configured email/support provider later.",
  status: "draft",
  sourceLabel: "system_generated"
}));

export const defaultCrmCampaignIdeas = [
  "Welcome new customer",
  "First purchase thank-you",
  "Review request",
  "VIP customer reward",
  "Wholesale inquiry follow-up",
  "Custom order nurture",
  "Holiday buyer campaign",
  "Jewelry stack campaign",
  "Digital product buyer upsell",
  "Reactivation campaign"
].map((name) => ({
  key: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
  name,
  status: "draft",
  providerStatus: "ready_for_provider_connection",
  sendsEmail: false
}));

export const defaultCrmAppointmentTypes = [
  "Custom order consultation",
  "Wholesale/boutique consultation",
  "AI readiness consult",
  "Product launch consult",
  "Support call"
].map((name) => ({
  key: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
  name,
  durationMinutes: name === "Support call" ? 20 : 30,
  bookingReadiness: "manual_setup_required"
}));

export const customerEventTypes = [
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "purchase",
  "form_submit",
  "email_click",
  "support_opened",
  "campaign_enrolled",
  "appointment_requested",
  "custom_event"
] as const;

export function customerSourceLabel(value: unknown) {
  const key = String(value || "manual_entry") as CustomerSourceLabel;
  return customerSourceLabelMap[key] ?? "Manual entry";
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysSince(value: unknown) {
  if (!value) return Infinity;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return Infinity;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function profileFlags(customer: CustomerRowLike) {
  const profile = customer.profile_json ?? customer.profileJson ?? {};
  const metadata = customer.metadata ?? {};
  return { ...metadata, ...profile } as Record<string, unknown>;
}

export function deriveCustomerNextActions(input: {
  customer?: CustomerRowLike | null;
  openTasks?: number;
  openSupportCases?: number;
  productInterests?: Array<Record<string, unknown>>;
  segmentKeys?: string[];
  abandonedCartEventsAvailable?: boolean;
}) {
  const customer = input.customer ?? {};
  const flags = profileFlags(customer);
  const actions: Array<{ actionType: string; title: string; reason: string; priority: "high" | "normal"; sourceLabel: "rules_based_ai_suggestion"; status: "suggested" }> = [];
  const email = customer.email ?? "";
  const phone = customer.phone ?? "";
  const orderCount = numberValue(customer.order_count ?? customer.orderCount);
  const lifetimeValue = numberValue(customer.lifetime_value ?? customer.lifetimeValue);
  const consent = String(customer.marketing_consent_status ?? customer.marketingConsentStatus ?? "unknown");
  const lastInteractionDays = daysSince(customer.last_interaction_at ?? customer.lastInteractionAt);
  const interests = input.productInterests ?? [];
  const segmentKeys = new Set(input.segmentKeys ?? []);

  const push = (actionType: string, title: string, reason: string, priority: "high" | "normal" = "normal") =>
    actions.push({ actionType, title, reason, priority, sourceLabel: "rules_based_ai_suggestion", status: "suggested" });

  if (!email && !phone) push("add_contact_details", "Add contact details.", "This profile has no email or phone, so follow-up channels are incomplete.", "high");
  if (!segmentKeys.size) push("assign_segment", "Assign a customer segment.", "Segmentation keeps future customer actions targeted and consent-aware.");
  if (orderCount === 1) push("thank_you_follow_up", "Send thank-you message.", "First purchase customers should receive a reviewed thank-you draft.");
  if (orderCount >= 2 && lifetimeValue >= 50) push("vip_segment", "Consider VIP segment.", "Repeat purchasing suggests the customer may belong in a VIP audience.");
  if (interests.some((item) => /jewelry|earring|necklace|bracelet|ring/i.test(String(item.product_type ?? item.productType ?? item.productTitle ?? "")))) push("jewelry_promo", "Invite to jewelry stack promotion.", "Jewelry interest was recorded on the profile.");
  if (interests.some((item) => /digital|download|template/i.test(String(item.product_type ?? item.productType ?? item.productTitle ?? "")))) push("digital_bundle", "Offer matching digital bundle.", "Digital product interest was recorded on the profile.");
  if (Boolean(flags.customOrderInterest)) push("custom_order_follow_up", "Create custom order follow-up task.", "A custom order interest flag is present.", "high");
  if (Boolean(flags.wholesaleLead) || Boolean(flags.boutiqueLead)) push("wholesale_follow_up", "Ask about boutique inventory needs.", "Wholesale or boutique lead flag is present.", "high");
  if (Boolean(flags.holidayBuyer)) push("holiday_campaign", "Add to holiday ornament campaign.", "Holiday buyer flag is present.");
  if (lastInteractionDays >= 90) push("reactivation", "Consider reactivation campaign.", "No customer interaction has been recorded in 90+ days.");
  else if (lastInteractionDays >= 60) push("reactivation", "Consider 60-day check-in.", "No customer interaction has been recorded in 60+ days.");
  else if (lastInteractionDays >= 30) push("check_in", "Consider 30-day follow-up.", "No customer interaction has been recorded in 30+ days.");
  if ((input.openSupportCases ?? 0) > 0) push("support_follow_up", "Prioritize support follow-up.", "Open support cases should be handled before marketing.", "high");
  if (consent !== "granted") push("confirm_consent", "Request/confirm marketing consent before campaign enrollment.", "Marketing campaigns require consent status to be confirmed.", "high");
  if (String(customer.lifecycle_stage ?? customer.lifecycleStage ?? "") === "lead" && orderCount === 0) push("first_purchase_offer", "Send first-purchase offer or product recommendation.", "High-intent leads need a reviewed first-purchase follow-up.");
  if (input.abandonedCartEventsAvailable) push("abandoned_cart_review", "Review abandoned cart candidate.", "Cart event data exists for this workspace.");

  return actions;
}

export function sortCustomerTimeline<T extends TimelineEventLike>(events: T[]) {
  return [...events].sort((a, b) =>
    String(b.event_at ?? b.eventAt ?? "").localeCompare(String(a.event_at ?? a.eventAt ?? ""))
  );
}

export function createCustomerCommandCenterSummary(input: {
  customers?: CustomerRowLike[];
  leads?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  segments?: Array<Record<string, unknown>>;
  forms?: Array<Record<string, unknown>>;
  campaigns?: Array<Record<string, unknown>>;
  conversations?: Array<Record<string, unknown>>;
  consultations?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  shopifyStatus?: string;
}) {
  const customers = input.customers ?? [];
  const leads = input.leads ?? [];
  const tasks = input.tasks ?? [];
  const segments = input.segments ?? [];
  const forms = input.forms ?? [];
  const campaigns = input.campaigns ?? [];
  const conversations = input.conversations ?? [];
  const consultations = input.consultations ?? [];
  const events = input.events ?? [];
  const now = Date.now();
  const dueTasks = tasks.filter((task) => {
    if (String(task.status ?? "") === "completed") return false;
    const due = task.due_at ?? task.dueAt;
    return due ? new Date(String(due)).getTime() <= now : false;
  });
  const repeatCustomers = customers.filter((customer) => numberValue(customer.order_count ?? customer.orderCount) > 1);
  const vipCustomers = customers.filter((customer) => numberValue(customer.lifetime_value ?? customer.lifetimeValue) >= 250 || numberValue(customer.order_count ?? customer.orderCount) >= 3);
  const highIntentLeads = leads.filter((lead) => ["high_intent", "qualified", "needs_follow_up"].includes(String(lead.status ?? "")));
  const blockerCards = [
    input.shopifyStatus !== "connected" && {
      title: "Shopify customer/order sync not configured",
      status: "needs_owner_action",
      detail: "Customer/order history appears after Shopify customer/order sync is configured."
    },
    !events.length && {
      title: "Customer behavior tracking not configured",
      status: "not_configured",
      detail: "Website/customer behavior tracking is not configured yet."
    },
    !forms.some((form) => String(form.status) === "active") && {
      title: "Capture widgets inactive",
      status: "setup_needed",
      detail: "Turn on capture forms or use manual intake to begin collecting leads."
    }
  ].filter(Boolean) as Array<{ title: string; status: string; detail: string }>;
  return {
    customerCount: customers.length,
    leadCount: leads.length,
    tasksDue: dueTasks.length,
    followUpsNeeded: tasks.filter((task) => String(task.status ?? "open") !== "completed").length,
    highIntentLeadsCount: highIntentLeads.length,
    vipRepeatCustomersCount: new Set([...repeatCustomers, ...vipCustomers].map((customer) => customer.id)).size,
    segmentsActive: segments.filter((segment) => String(segment.status ?? "active") === "active").length,
    captureWidgetsActive: forms.filter((form) => String(form.status) === "active").length,
    campaignsDraft: campaigns.filter((campaign) => String(campaign.status ?? "draft") === "draft").length,
    campaignsActivePlaceholder: 0,
    supportConversationsPlaceholder: conversations.length,
    scheduledConsultationsPlaceholder: consultations.length,
    customerIntelligenceReadiness: events.length ? "detected" : "not_configured",
    setupProgress: Math.round(([
      customers.length > 0,
      leads.length > 0,
      segments.length > 0,
      forms.length > 0,
      input.shopifyStatus === "connected",
      events.length > 0
    ].filter(Boolean).length / 6) * 100),
    blockerCards,
    emptyState: customers.length === 0 && leads.length === 0
  };
}

export function customerRecordIsSafeForClient(row: Record<string, unknown>) {
  return !/access_token|refresh_token|client_secret|api[_-]?token|DATABASE_URL|service_role/i.test(JSON.stringify(row));
}
