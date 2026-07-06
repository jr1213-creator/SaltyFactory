import { describe, expect, it } from "vitest";
import {
  COMMERCE_AGENT_ROLE_DISABLED,
  commerceAgentRoleCatalog,
  commerceAgentRoleKeys,
  commerceAgentToolNames,
  getAgentToolsForRole,
  listCommerceAgentRoles,
  registerCommerceAgentRoles,
  runCommerceAgent,
  shopManagerAgentRoleDefinitions
} from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";

const workspaceId = "wks_default";
const actorId = "shop_manager_role_test";
const forbiddenToolNames = [
  "sendEmail",
  "sendSms",
  "publishSocialPost",
  "scheduleSocialPost",
  "mutateShopifyProduct",
  "publishShopifyProduct",
  "createMetaCampaign",
  "createGoogleAdsCampaign",
  "createPinterestCampaign",
  "createTikTokCampaign",
  "changeBudget",
  "activateCampaign",
  "callPrintify",
  "callHuggingFace",
  "generateImage",
  "scrapeWebsite",
  "useBrowserAutomation",
  "autoApprove"
];

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

describe("shop manager commerce agent role registry", () => {
  it("registers all 28 agents with allowed tools and forbidden actions", async () => {
    const repos = seedRepos();
    const roles = await registerCommerceAgentRoles({ repos, workspaceId, actorId });

    expect(roles).toHaveLength(28);
    expect(commerceAgentRoleCatalog).toHaveLength(28);
    expect(commerceAgentRoleKeys).toHaveLength(28);
    expect(shopManagerAgentRoleDefinitions).toHaveLength(28);
    expect(new Set(roles.map((role) => role.role_key)).size).toBe(28);

    for (const role of roles) {
      expect(role.role_key).toBeTruthy();
      expect(role.display_name).toBeTruthy();
      expect(role.purpose).toBeTruthy();
      expect(role.allowed_tools.length).toBeGreaterThan(0);
      expect(role.allowed_tools.every((tool) => commerceAgentToolNames.includes(tool))).toBe(true);
      expect(role.forbidden_actions).toEqual(expect.arrayContaining(forbiddenToolNames));
      expect(role.input_entity_types.length).toBeGreaterThan(0);
      expect(role.output_entity_types.length).toBeGreaterThan(0);
      expect(["low", "medium", "high", "critical"]).toContain(role.risk_level);
      expect(role.is_enabled).toBe(true);
      expect(getAgentToolsForRole(role.role_key).map((tool) => tool.name).sort()).toEqual(role.allowed_tools.slice().sort());
    }

    const persisted = await listCommerceAgentRoles({ repos, workspaceId });
    expect(persisted.map((role) => role.role_key).sort()).toEqual(commerceAgentRoleKeys.slice().sort());
  });

  it("blocks disabled roles before an agent run can persist output", async () => {
    const repos = seedRepos();
    await registerCommerceAgentRoles({ repos, workspaceId, actorId });
    const roleRows = await repos.commerceAgent.roles.listByWorkspace(workspaceId);
    const readinessRole = roleRows.find((row) => row.role_key === "product_readiness_launch_gate");
    expect(readinessRole).toBeTruthy();
    await repos.commerceAgent.roles.update(readinessRole!.id, { is_enabled: false, status: "disabled" });

    await expect(runCommerceAgent({
      repos,
      workspaceId,
      actorId,
      roleKey: "product_readiness_launch_gate"
    })).rejects.toThrow(COMMERCE_AGENT_ROLE_DISABLED);

    expect(await repos.commerceAgent.recommendations.listByWorkspace(workspaceId)).toHaveLength(0);
    expect(await repos.commerceAgent.qualityChecks.listByWorkspace(workspaceId)).toHaveLength(0);
  });

  it("does not expose forbidden provider, send, spend, publish, image, or auto-approval tools through role metadata", () => {
    for (const role of commerceAgentRoleCatalog) {
      const toolNames = getAgentToolsForRole(role.role_key).map((tool) => tool.name);
      expect(toolNames.sort()).toEqual(role.allowed_tools.slice().sort());
      for (const forbidden of forbiddenToolNames) {
        expect(toolNames).not.toContain(forbidden);
      }
    }

    const behavioralTools = getAgentToolsForRole("behavioral_psychology_customer_empathy").map((tool) => tool.name);
    expect(behavioralTools).toEqual(expect.arrayContaining(["consultBehavioralPsychology", "runPolicyReview"]));
    for (const forbidden of ["publishShopifyProduct", "changeBudget", "sendEmail", "generateImage"]) {
      expect(behavioralTools).not.toContain(forbidden);
    }

    const shopManagerTools = getAgentToolsForRole("shop_manager_approval_intelligence").map((tool) => tool.name);
    expect(shopManagerTools).toEqual(expect.arrayContaining(["createApprovalPrediction", "recordOwnerApprovalFeedback"]));
    for (const forbidden of ["autoApprove", "mutateShopifyProduct", "callPrintify"]) {
      expect(shopManagerTools).not.toContain(forbidden);
    }
    expect(getAgentToolsForRole("unknown_commerce_role")).toHaveLength(0);
  });
});
