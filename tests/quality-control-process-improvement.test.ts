import { describe, expect, it } from "vitest";
import {
  createCommerceQualityCheck,
  createProcessImprovementFinding,
} from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";
import { marketingActorId, marketingWorkspaceId } from "./marketing-test-helpers";

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

describe("Quality Control / Process Improvement Agent", () => {
  it("detects repeated failures and suggests process, prompt, tool, and schema improvements without applying them", async () => {
    const repos = seedRepos();
    await createCommerceQualityCheck({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "creative_qa_print_risk",
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: "concept_qc",
      checkType: "creative_qa_print_risk",
      verdict: "warning",
      score: 52,
      reasons: ["mockup_missing"],
      fixSuggestions: ["Add owner-reviewed mockups before launch movement."]
    });
    await createCommerceQualityCheck({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "creative_qa_print_risk",
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: "concept_qc_2",
      checkType: "creative_qa_print_risk",
      verdict: "blocked",
      score: 30,
      reasons: ["asset_qa_missing"],
      fixSuggestions: ["Run transparent PNG QA before approval."]
    });

    const finding = await createProcessImprovementFinding({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "quality_control_process_improvement"
    });

    expect(finding.finding_type ?? finding.findingType).toBe("repeated_quality_failure");
    expect(finding.repeated_pattern ?? finding.repeatedPattern).toBe(true);
    expect(finding.severity).toBe("high");
    expect(finding.recommended_process_change).toContain("preflight checklist");
    expect(finding.recommended_prompt_change).toContain("blocker evidence");
    expect(finding.recommended_tool_change).toContain("diagnostic tool");
    expect(finding.recommended_schema_change ?? finding.recommendedSchemaChange ?? null).toBeNull();
    expect(finding.review_status ?? finding.reviewStatus).toBe("pending_review");

    const checks = await repos.commerceAgent.qualityChecks.listByWorkspace(marketingWorkspaceId);
    expect(checks.map((check) => check.verdict)).toEqual(expect.arrayContaining(["warning", "blocked"]));
    expect(await repos.commerceAgent.processImprovementFindings.listByWorkspace(marketingWorkspaceId)).toHaveLength(1);
  });
});
