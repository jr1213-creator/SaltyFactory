import type { AgentToolDefinition } from "./agent-tools";
import { productListingAssistantTools } from "./agent-tools";
import type { ModelInputSensitivity, ModelRiskLevel } from "./model-runtime";

export type AgentRoleDefinition = {
  roleKey: string;
  taskTypes: string[];
  buildSystemPrompt: (task: unknown) => string;
  tools: AgentToolDefinition[];
  defaultRiskLevel: ModelRiskLevel;
  defaultInputSensitivity: ModelInputSensitivity;
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
  defaultInputSensitivity: "internal"
};

const defaultAgentRoleDefinitions: AgentRoleDefinition[] = [productListingAssistantRoleDefinition];

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
