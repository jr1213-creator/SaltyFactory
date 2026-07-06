import { describe, expect, it } from "vitest";
import { recheckPolicyRewrite, runCommerceAgent, runDeterministicPolicyRules, runUnifiedPolicyIpCheck } from "@saltyfactory/ai-free";
import { coreInput, createDeterministicCoreRepos, deterministicActorId, deterministicWorkspaceId, seedDeterministicDraft } from "./agent-deterministic-core-test-helpers";

describe("unified deterministic policy, claims, and IP core", () => {
  it("flags protected brands, official/license/copycat language, unsupported claims, and personal-attribute copy", () => {
    const checked = runDeterministicPolicyRules({
      text: "Official licensed Disney inspired by dupe waterproof. Are you a 40-year-old woman in Texas?"
    });
    expect(checked.blocked).toBe(true);
    expect(checked.policy_codes).toEqual(expect.arrayContaining([
      "protected_ip_brand",
      "official_license_claim",
      "copycat_language",
      "unsupported_material_claim",
      "direct_personal_attribute_copy"
    ]));
    expect(checked.risk_level).toBe("severe");
  });

  it("allows neutral internal audience context while blocking direct generated copy", () => {
    const neutral = runDeterministicPolicyRules({ text: "Targeting women 40+ in Texas as internal strategy context only." });
    const direct = runDeterministicPolicyRules({ text: "Are you a 40-year-old woman in Texas who needs this?" });
    expect(neutral.blocked).toBe(false);
    expect(direct.policy_codes).toContain("direct_personal_attribute_copy");
  });

  it("passes a clean fixture and persists policy review details", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "policy_clean", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await runUnifiedPolicyIpCheck(coreInput(repos, fixture, { content: "Original coastal western accessory copy." }));
    expect(result.result.risk_level).toBe("none");
    expect(result.result.flagged_terms).toHaveLength(0);
    expect(result.policyReview.source_text_hash ?? result.policyReview.sourceTextHash).toBeTruthy();
    expect(result.policyReview.ruleset_version ?? result.policyReview.rulesetVersion).toBeTruthy();
  });

  it("rechecks suggested rewrites and does not let LLM context clear deterministic flags", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "policy_rewrite", title: "Official Barbie Inspired By Charm", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await runUnifiedPolicyIpCheck(coreInput(repos, fixture, { llmNarrative: "This looks safe." }));
    expect(result.result.blocked).toBe(true);
    expect(result.result.risk_level).toBe("severe");
    expect(result.result.rewrite_recheck_status).toBe("passed");
    expect(result.policyReview.llm_context_note ?? result.policyReview.llmContextNote).toContain("safe");
  });

  it("fails rewrite recheck when a rewrite still has non-blocking unsupported claim flags", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "policy_rewrite_medium", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await recheckPolicyRewrite({ ...coreInput(repos, fixture), rewrite: "Waterproof handmade accessory for owner review." });

    expect(result.blocked).toBe(false);
    expect(result.risk_level).toBe("medium");
    expect(result.policy_codes).toContain("unsupported_material_claim");
    expect(result.rewrite_recheck_status).toBe("failed");
  });

  it("routes duplicate IP and policy role keys through the same persisted unified checker", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "policy_duplicate_roles", title: "Official Disney Charm", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });

    await runCommerceAgent({ repos, workspaceId: deterministicWorkspaceId, actorId: deterministicActorId, roleKey: "ip_trademark_copycat_risk", sourceEntityType: fixture.sourceEntityType, sourceEntityId: fixture.sourceEntityId });
    await runCommerceAgent({ repos, workspaceId: deterministicWorkspaceId, actorId: deterministicActorId, roleKey: "policy_claims_ip_risk_checker", sourceEntityType: fixture.sourceEntityType, sourceEntityId: fixture.sourceEntityId });

    const policyReviews = await repos.marketing.policyReviewResults.listByWorkspace(deterministicWorkspaceId);
    expect(policyReviews.some((row) => (row.ruleset_version ?? row.rulesetVersion) === "policy_claims_ip_v1")).toBe(true);
    expect(policyReviews.filter((row) => (row.target_id ?? row.targetId) === fixture.sourceEntityId)).toHaveLength(1);
  });
});
