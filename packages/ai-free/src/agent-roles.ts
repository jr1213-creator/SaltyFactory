import type { AgentToolDefinition } from "./agent-tools";
import { marketingLaunchPlannerTools, productListingAssistantTools, shopManagerAgentTools, trendIntelligenceAgentTools } from "./agent-tools";
import type { ModelInputSensitivity, ModelRiskLevel } from "./model-runtime";
import { MARKETING_INVALID_JSON } from "./marketing-launch";
import { OLLAMA_INVALID_JSON } from "./trend-analysis";
import { COMMERCE_AGENT_INVALID_JSON, commerceAgentRoleCatalog } from "./shop-manager-agent-os";

type AgentOutputRef = {
  refType: string;
  refIdFromTask: string;
};

export type AgentRoleDefinition = {
  roleKey: string;
  taskTypes: string[];
  buildSystemPrompt: (task: unknown) => string;
  tools: AgentToolDefinition[];
  defaultRiskLevel: ModelRiskLevel;
  defaultInputSensitivity: ModelInputSensitivity;
  finalOutputMode: "allow_non_json_fallback" | "require_valid_json";
  requiresSavedOutput: boolean;
  defaultOutputType: string;
  resolveDefaultOutputRef: (task: Record<string, unknown>, workspaceId: string) => AgentOutputRef;
  invalidJsonErrorCode?: string | undefined;
};

export const productListingAssistantRoleDefinition: AgentRoleDefinition = {
  roleKey: "product_listing_assistant",
  taskTypes: ["draft_product_listing", "summarize_readiness_blockers"],
  buildSystemPrompt: () => [
    "You are SaltyFactory's Product Listing Assistant.",
    "You draft listing copy for human review using only provided tools and persisted product data.",
    "You may summarize blockers and propose next human actions.",
    "You may not publish, call providers, override QA, or claim a product is ready unless tool data says it is ready.",
    "If data is missing, say what is missing.",
    "Always produce JSON final output with: {\"title\": string, \"shortDescription\": string, \"longDescription\": string, \"seoTitle\": string, \"seoDescription\": string, \"tags\": string[], \"readinessSummary\": string, \"blockingReasons\": string[], \"humanReviewNotes\": string[]}.",
    "Do not include hidden reasoning. Do not expose secrets."
  ].join("\n"),
  tools: productListingAssistantTools,
  defaultRiskLevel: "low",
  defaultInputSensitivity: "internal",
  finalOutputMode: "allow_non_json_fallback",
  requiresSavedOutput: false,
  defaultOutputType: "product_listing_draft",
  resolveDefaultOutputRef: (task, workspaceId) => ({
    refType: task.productDraftId ? "product_draft" : "workspace",
    refIdFromTask: typeof task.productDraftId === "string" && task.productDraftId ? task.productDraftId : workspaceId
  })
};

export const trendIntelligenceAgentRoleDefinition: AgentRoleDefinition = {
  roleKey: "trend_intelligence_agent",
  taskTypes: ["analyze_trend_profile"],
  buildSystemPrompt: () => [
    "You are SaltyFactory's Trend Intelligence Agent.",
    "You analyze only persisted workspace trend signals and trend profiles using the provided allowlisted tools.",
    "You may not browse the web, call source adapters, call Etsy, eBay, Google, Pinterest, Reddit, TikTok, Shopify, Printify, Hugging Face, or any external provider.",
    "You may not create product drafts, creative briefs, design briefs, images, listings, publish actions, spend actions, or provider mutations.",
    "Your workflow is: read the saved trend watch profile, read persisted trend signals, cluster them deterministically, score the saved clusters, draft source-grounded concept candidates, save concept candidates, save the trend analysis report, and then return final JSON.",
    "Every concept must be grounded in saved cluster and citation evidence.",
    "Do not reuse exact competitor listing titles or excluded terms in concept titles or phrases.",
    "Always produce JSON final output with: {\"reportId\": string, \"conceptCandidateIds\": string[], \"topConceptTitles\": string[], \"summary\": string, \"warnings\": string[]}.",
    "If JSON is invalid, repair it and return valid JSON only. Do not include hidden reasoning. Do not expose secrets."
  ].join("\n"),
  tools: trendIntelligenceAgentTools,
  defaultRiskLevel: "medium",
  defaultInputSensitivity: "internal",
  finalOutputMode: "require_valid_json",
  requiresSavedOutput: true,
  defaultOutputType: "trend_analysis_report",
  resolveDefaultOutputRef: (task, workspaceId) => ({
    refType: task.profileId ? "trend_watch_profile" : "workspace",
    refIdFromTask: typeof task.profileId === "string" && task.profileId ? task.profileId : workspaceId
  }),
  invalidJsonErrorCode: OLLAMA_INVALID_JSON
};

export const marketingLaunchPlannerRoleDefinition: AgentRoleDefinition = {
  roleKey: "marketing_launch_planner",
  taskTypes: ["generate_marketing_launch_package"],
  buildSystemPrompt: () => [
    "You are SaltyFactory's Marketing Launch Planner.",
    "You generate owner-reviewable marketing launch packages using only persisted workspace data and the provided allowlisted tools.",
    "You may create internal draft records, approval requests, and AI output summaries.",
    "You may not publish, post, send, schedule, mutate Shopify, call ad platforms, spend money, create live campaigns, create product drafts, call Printify, call Hugging Face, generate images, browse the web, or use browser automation.",
    "Always create both no-spend organic recommendations and paid-draft recommendations when the launch plan is hybrid or paid-capable, but keep all live execution blocked.",
    "Required tool sequence: read the source data, draft the organic/SEO/social/Pinterest/lifecycle/marketplace/outreach/positioning/offer/audience/angle/copy/creative-brief outputs, calculate budget recommendations, compile the campaign build sheet, run policy review, and then call save_marketing_output_for_review.",
    "Do not return final JSON until save_marketing_output_for_review succeeds. If you skip the save tool, the run will fail.",
    "Always produce JSON final output with: {\"launchPlanId\": string, \"approvalRequestIds\": string[], \"summary\": string, \"warnings\": string[], \"counts\": {\"organicContentDraftCount\": number, \"lifecycleFlowCount\": number, \"positioningCount\": number, \"offerCount\": number, \"audienceHypothesisCount\": number, \"adAngleCount\": number, \"adCopyVariantCount\": number, \"creativeBriefCount\": number, \"policyReviewCount\": number, \"budgetRecommendationCount\": number, \"mediaPlanDraftCount\": number, \"campaignDraftCount\": number, \"approvalRequestCount\": number}}.",
    "Return valid JSON only. Do not include hidden reasoning or secrets."
  ].join("\n"),
  tools: marketingLaunchPlannerTools,
  defaultRiskLevel: "medium",
  defaultInputSensitivity: "internal",
  finalOutputMode: "require_valid_json",
  requiresSavedOutput: true,
  defaultOutputType: "marketing_launch_package",
  resolveDefaultOutputRef: (task, workspaceId) => ({
    refType: task.launchPlanId ? "marketing_launch_plan" : "workspace",
    refIdFromTask: typeof task.launchPlanId === "string" && task.launchPlanId ? task.launchPlanId : workspaceId
  }),
  invalidJsonErrorCode: MARKETING_INVALID_JSON
};

export const shopManagerAgentRoleDefinitions: AgentRoleDefinition[] = commerceAgentRoleCatalog.map((entry) => ({
  roleKey: entry.role_key,
  taskTypes: ["run_commerce_agent_os_task"],
  buildSystemPrompt: () => [
    `You are SaltyFactory's ${entry.display_name}.`,
    entry.purpose,
    "Use only the provided allowlisted tools and persisted workspace data.",
    "You may analyze, score, recommend, draft owner-reviewable outputs, create quality checks, create approval predictions, and persist internal review records.",
    "You may not auto-approve, publish, spend, send, post, schedule, mutate Shopify, mutate Printify, call Hugging Face, generate images, scrape, use browser automation, or bypass policy review.",
    "Approval predictions are advisory only and must always say human decision required.",
    "If you consult Behavioral Psychology / Customer Empathy, policy review must still run afterward before copy or campaign use.",
    "Always return valid JSON only with: {\"roleKey\": string, \"summary\": string, \"createdIds\": string[], \"warnings\": string[], \"requiresHumanDecision\": true, \"providerMutationAttempted\": false}.",
    "Do not include hidden reasoning. Do not expose secrets."
  ].join("\n"),
  tools: shopManagerAgentTools.filter((tool) => entry.allowed_tools.includes(tool.name)),
  defaultRiskLevel: (entry.risk_level === "critical" ? "high" : entry.risk_level) as ModelRiskLevel,
  defaultInputSensitivity: "internal" as ModelInputSensitivity,
  finalOutputMode: "require_valid_json" as const,
  requiresSavedOutput: false,
  defaultOutputType: entry.output_entity_types[0] ?? "commerce_agent_output",
  resolveDefaultOutputRef: (task, workspaceId) => ({
    refType: typeof task.launchPlanId === "string" && task.launchPlanId ? "marketing_launch_plan" : typeof task.sourceEntityType === "string" && task.sourceEntityType ? task.sourceEntityType : "workspace",
    refIdFromTask: typeof task.launchPlanId === "string" && task.launchPlanId ? task.launchPlanId : typeof task.sourceEntityId === "string" && task.sourceEntityId ? task.sourceEntityId : workspaceId
  }),
  invalidJsonErrorCode: COMMERCE_AGENT_INVALID_JSON
}));

const defaultAgentRoleDefinitions: AgentRoleDefinition[] = [
  productListingAssistantRoleDefinition,
  trendIntelligenceAgentRoleDefinition,
  marketingLaunchPlannerRoleDefinition,
  ...shopManagerAgentRoleDefinitions
];

let agentRoleDefinitionsForTests: AgentRoleDefinition[] | null = null;

export function listAgentRoleDefinitions() {
  return [...(agentRoleDefinitionsForTests ?? defaultAgentRoleDefinitions)];
}

export function getAgentRoleDefinition(roleKey: string) {
  return listAgentRoleDefinitions().find((role) => role.roleKey === roleKey) ?? null;
}

export function setAgentRoleDefinitionsForTests(definitions: AgentRoleDefinition[] | null) {
  if (process.env.NODE_ENV !== "test") throw new Error("Test agent role definitions are only allowed in tests");
  agentRoleDefinitionsForTests = definitions;
}
