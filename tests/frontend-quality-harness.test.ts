import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as ui from "@saltyfactory/ui";

const root = process.cwd();

describe("frontend quality harness", () => {
  it("ships the requested shared design-system components", () => {
    for (const component of [
      "StudioAppShell",
      "CommandCenterHeader",
      "PageHeader",
      "SectionHeader",
      "EntityDetailLayout",
      "StickyActionFooter",
      "WorkflowProgress",
      "ProductPipelineBoard",
      "BlockerCard",
      "ApprovalActionBar",
      "PublishGateChecklist",
      "OwnerDecisionPanel",
      "ProviderHealthCard",
      "ProviderHealthBadge",
      "SetupRequiredPanel",
      "ProviderResultPanel",
      "SyncStatusBadge",
      "AiEmployeeCard",
      "HiringRequestCard",
      "ImprovementSuggestionCard",
      "CapabilityRequestPanel",
      "ToolAccessPanel",
      "TrainingRequestPanel",
      "PermissionScopeMatrix",
      "GuardrailEditor",
      "BusinessKpiCard",
      "UnitEconomicsCard",
      "OpportunityCard",
      "DecisionMemoPanel",
      "BusinessDocumentCard",
      "BusinessCardPreview",
      "LegitimacyChecklist",
      "MakeMeLookLegitPanel",
      "BankingConnectionCard",
      "AuthorityRequestPanel"
    ]) {
      expect(ui, component).toHaveProperty(component);
    }
  });

  it("adds Storybook stories for critical provider, POD, AI, and business components", () => {
    const storyPath = join(root, "packages/ui/src/frontend-quality.stories.tsx");
    expect(existsSync(join(root, ".storybook/main.ts"))).toBe(true);
    expect(existsSync(join(root, ".storybook/preview.ts"))).toBe(true);
    const story = readFileSync(storyPath, "utf8");
    for (const name of [
      "ProviderHealthDefault",
      "ProductPipelineDefault",
      "VariantMarginMatrixDefault",
      "BlockerCardDefault",
      "MockupPreviewDefault",
      "ShopifyDraftDefault",
      "HiringRequestDefault",
      "ImprovementSuggestionDefault",
      "BusinessKpiDefault",
      "UnitEconomicsDefault",
      "DecisionMemoDefault",
      "BusinessCardPreviewDefault",
      "MakeMeLookLegitDefault",
      "AuthorityRequestDefault"
    ]) {
      expect(story).toContain(`function ${name}`);
    }
  });

  it("adds Playwright frontend QA without bypassing auth", () => {
    const config = readFileSync(join(root, "playwright.config.ts"), "utf8");
    const spec = readFileSync(join(root, "e2e/studio-frontend-quality.spec.ts"), "utf8");
    expect(config).toContain("dev:studio");
    expect(spec).toContain("/studio/publish-review");
    expect(spec).toContain("/studio/ai-employees/models");
    expect(spec).toContain("redirects unauthenticated users");
    expect(spec).toContain("test.skip");
    expect(spec).toContain("do not bypass production auth");
    expect(spec).not.toMatch(/STUDIO_AUTH_ENABLED=false|auth bypass|sf_studio_session/i);
  });

  it("documents frontend AI and performance review workflow", () => {
    for (const doc of [
      "docs/frontend-quality-audit-v1.md",
      "docs/frontend-performance-workflow-v1.md",
      "docs/frontend-ai-workflow-v1.md"
    ]) {
      expect(existsSync(join(root, doc))).toBe(true);
    }
    const workflow = readFileSync(join(root, "docs/frontend-ai-workflow-v1.md"), "utf8");
    expect(workflow).toContain("Codex implements production code");
    expect(workflow).toContain("Playwright is the source of browser truth");
  });
});
