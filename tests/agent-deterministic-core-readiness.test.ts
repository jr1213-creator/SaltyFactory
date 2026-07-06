import { describe, expect, it } from "vitest";
import { runDeterministicReadinessCheck } from "@saltyfactory/ai-free";
import { coreInput, createDeterministicCoreRepos, seedDeterministicDraft } from "./agent-deterministic-core-test-helpers";

describe("deterministic product readiness core", () => {
  it("keeps deterministic score identical across repeated underpriced missing-mockup runs", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "readiness_repeat", price: "15.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90", includeMockup: false, includeAsset: false });
    const runs = [];
    for (let index = 0; index < 3; index += 1) {
      const result = await runDeterministicReadinessCheck(coreInput(repos, fixture));
      runs.push(result.deterministic);
    }
    expect(runs[1]).toEqual(runs[0]);
    expect(runs[2]).toEqual(runs[0]);
    expect(runs[0]?.verdict).toBe("blocked");
    expect(runs[0]?.blocking_issues).toContain("margin_floor_breach");
    expect(runs[0]?.warnings).toContain("mockup_or_asset_missing");
  });

  it("marks a complete approved fixture ready with deterministic checklist evidence", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "readiness_ready", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await runDeterministicReadinessCheck(coreInput(repos, fixture));
    expect(result.deterministic.verdict).toBe("ready");
    expect(result.deterministic.readiness_score).toBe(100);
    expect(result.readinessCheck.evidence_refs ?? result.readinessCheck.evidenceRefs).toEqual(expect.arrayContaining([expect.objectContaining({ type: "margin_analysis" }), expect.objectContaining({ type: "policy_review" })]));
  });

  it("blocks unapproved and high-policy-risk fixtures", async () => {
    const repos = createDeterministicCoreRepos();
    const unapproved = await seedDeterministicDraft({ repos, suffix: "readiness_unapproved", approved: false, price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const highRisk = await seedDeterministicDraft({ repos, suffix: "readiness_policy", title: "Official Disney Coastal Charm", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });

    const unapprovedResult = await runDeterministicReadinessCheck(coreInput(repos, unapproved));
    const highRiskResult = await runDeterministicReadinessCheck(coreInput(repos, highRisk));

    expect(unapprovedResult.deterministic.verdict).toBe("blocked");
    expect(unapprovedResult.deterministic.blocking_issues).toContain("source_entity_approved");
    expect(highRiskResult.deterministic.verdict).toBe("blocked");
    expect(highRiskResult.deterministic.blocking_issues).toContain("policy_or_ip_blocked");
  });

  it("warns on missing margin data and does not let LLM explanation override deterministic failure", async () => {
    const repos = createDeterministicCoreRepos();
    const missingMargin = await seedDeterministicDraft({ repos, suffix: "readiness_missing_margin", price: "30.00", cost: null, shippingCost: null, paymentFee: null, platformFee: null });
    const missingResult = await runDeterministicReadinessCheck(coreInput(repos, missingMargin));
    expect(missingResult.deterministic.warnings).toContain("missing_cost_data");
    expect(missingResult.deterministic.verdict).toBe("needs_fixes");

    const underpriced = await seedDeterministicDraft({ repos, suffix: "readiness_llm_override", price: "15.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const blocked = await runDeterministicReadinessCheck(coreInput(repos, underpriced, { llmNarrative: "This is ready to proceed." }));
    expect(blocked.deterministic.verdict).toBe("blocked");
    expect(blocked.readinessCheck.llm_explanation ?? blocked.readinessCheck.llmExplanation).toContain("ready");
  });

  it("warns when policy risk is flagged but not hard-blocking", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "readiness_medium_policy", title: "Waterproof Coastal Charm", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await runDeterministicReadinessCheck(coreInput(repos, fixture));

    expect(result.deterministic.blocking_issues).not.toContain("policy_or_ip_blocked");
    expect(result.deterministic.warnings).toContain("policy_risk_medium");
    expect(result.deterministic.verdict).toBe("needs_fixes");
  });

  it("rejects missing source input", async () => {
    const repos = createDeterministicCoreRepos();
    await expect(runDeterministicReadinessCheck({ repos, workspaceId: "wks_default", actorId: "actor" })).rejects.toThrow("agent_core_source_required");
  });
});
