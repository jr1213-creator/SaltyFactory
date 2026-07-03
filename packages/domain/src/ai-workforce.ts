export const globalForbiddenAiEmployeeActions = [
  "publish",
  "send",
  "spend",
  "sync",
  "delete",
  "change_dns",
  "expose_secrets",
  "modify_provider_credentials",
  "create_live_ads",
  "send_email",
  "post_to_social",
  "publish_shopify_product",
  "publish_printify_product",
  "connect_bank_accounts",
  "access_ein",
  "access_full_bank_account_details",
  "submit_applications",
  "place_print_orders",
  "initiate_transfers",
  "initiate_payments"
] as const;

export const defaultAiRoleTemplates = [
  "Printify Catalog & Variant Specialist",
  "Shopify Product Sync Specialist",
  "Image Generation QA Specialist",
  "Batch Launch Coordinator",
  "Product SEO Metadata Specialist",
  "Pricing & Margin Analyst",
  "Social Care Classifier",
  "Campaign Proof Pack Editor",
  "Provider Readiness Auditor",
  "Risk / IP Review Assistant",
  "Business Strategy Analyst",
  "Business Identity Steward",
  "Banking Intelligence Analyst",
  "Document Operations Specialist",
  "Business Legitimacy Coach"
] as const;

export function normalizeAiForbiddenActions(actions: unknown) {
  const requested = Array.isArray(actions) ? actions.map(String) : [];
  return [...new Set([...globalForbiddenAiEmployeeActions, ...requested])];
}

export function hasForbiddenAiEmployeeAction(actions: unknown) {
  const values = Array.isArray(actions) ? actions.map((action) => String(action).toLowerCase()) : [];
  const forbidden = new Set(globalForbiddenAiEmployeeActions.map((action) => String(action).toLowerCase()));
  return values.some((action) => forbidden.has(action));
}

export function buildRoleSpec(input: {
  roleTitle: string;
  department: string;
  detectedGap: string;
  reasonNeeded: string;
  allowedTools?: string[];
  allowedActions?: string[];
  forbiddenActions?: string[];
}) {
  const forbiddenActions = normalizeAiForbiddenActions(input.forbiddenActions);
  const allowedActions = (input.allowedActions ?? ["draft", "recommend", "write_internal"]).filter((action) => !forbiddenActions.includes(action));
  return {
    role_title: input.roleTitle,
    mission: `Close the ${input.detectedGap} gap for ${input.department} with owner-reviewed drafts only.`,
    responsibilities: [
      "Read workspace-approved internal records.",
      "Draft recommendations and handoff packets.",
      "Create owner-reviewable tasks when blocked.",
      "Escalate missing authority, provider setup, and risky actions."
    ],
    qualifications: [
      "Understands SaltyFactory owner gates.",
      "Can explain blockers with exact setup requirements.",
      "Never treats provider configuration as successful unless verified."
    ],
    required_inputs: ["workspace records", "owner-approved source context", "current blocker state"],
    expected_outputs: ["recommendations", "decision notes", "internal tasks", "approval-ready drafts"],
    allowed_tools: input.allowedTools ?? ["workspace_read", "draft_writer", "task_creator"],
    allowed_actions: allowedActions,
    forbidden_actions: forbiddenActions,
    required_guardrails: [
      "Owner approval required for publish/send/spend/sync/delete/provider actions.",
      "No access to secrets, EIN, bank credentials, or full account numbers.",
      "No live provider execution unless a route-level owner gate approves it."
    ],
    approval_requirements: ["Owner approval before employee definition is created.", "Owner approval before any authority scope is granted."],
    success_metrics: ["Blockers are reduced without weakening guardrails.", "Handoffs include next route and exact missing setup."],
    failure_modes: ["Overstating provider readiness.", "Requesting forbidden authority.", "Creating generic suggestions without evidence."],
    test_cases: ["Cannot self-grant permissions.", "Cannot publish or spend.", "Can create owner-reviewable internal recommendations."],
    onboarding_tasks: ["Review workspace guardrails.", "Review provider readiness model.", "Create first blocked-handoff note."],
    first_tasks: [`Investigate ${input.detectedGap}.`, `Draft a safe plan for ${input.reasonNeeded}.`],
    prompt_profile: `You are ${input.roleTitle}. You draft only, explain blockers exactly, and never execute forbidden actions.`
  };
}
