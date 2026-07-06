import { describe, expect, it } from "vitest";
import {
  consultBehavioralPsychology,
  runCommerceAgent,
  runCommercePolicyReview
} from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";
import { marketingActorId, marketingWorkspaceId, seedMarketingLaunchPlan } from "./marketing-test-helpers";

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

function output(result: Awaited<ReturnType<typeof consultBehavioralPsychology>>) {
  return result.consultation;
}

describe("Behavioral Psychology / Customer Empathy Agent", () => {
  it("returns schema-valid persisted guidance for audience context without diagnosis or approval authority", async () => {
    const repos = seedRepos();
    const result = await consultBehavioralPsychology({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "behavioral_psychology_customer_empathy",
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: "concept_behavioral_test",
      audienceContext: "women 40+ in Texas as targeting context only",
      content: "For shoppers who love coastal western style, review this giftable charm before any manual launch.",
      consultationType: "audience_ad_pdp_context"
    });
    const consultation = output(result);

    expect(consultation.consultation_type).toBe("audience_ad_pdp_context");
    expect(consultation.customer_context_summary).toContain("women 40+ in Texas");
    expect(consultation.customer_motivation_summary).toContain("identity");
    expect(consultation.likely_objections.length).toBeGreaterThan(0);
    expect(consultation.trust_signals_needed.length).toBeGreaterThan(0);
    expect(consultation.friction_points.length).toBeGreaterThan(0);
    expect(consultation.emotional_drivers).toEqual(expect.arrayContaining(["giftability"]));
    expect(consultation.clarity_improvements.length).toBeGreaterThan(0);
    expect(consultation.ethical_persuasion_notes.join(" ")).toContain("do not exploit");
    expect(consultation.recommended_framing.length).toBeGreaterThan(0);
    expect(consultation.avoid_framing).toContain("Are you a 40-year-old woman in Texas?");
    expect(consultation.requires_policy_review).toBe(true);
    expect(JSON.stringify(consultation)).not.toMatch(/diagnos/i);

    const rows = await repos.commerceAgent.behavioralConsultations.listByWorkspace(marketingWorkspaceId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.requires_policy_review ?? rows[0]?.requiresPolicyReview).toBe(true);
  });

  it("flags direct personal-attribute copy and cannot bypass the policy checker", async () => {
    const repos = seedRepos();
    const unsafeCopy = "Are you a 40-year-old woman in Texas who needs this official Barbie-inspired dupe before it sells out?";

    const result = await consultBehavioralPsychology({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "behavioral_psychology_customer_empathy",
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: "concept_behavioral_unsafe",
      audienceContext: "women 40+ in Texas",
      content: unsafeCopy
    });
    const consultation = output(result);

    expect(consultation.sensitive_attribute_warnings).toEqual(expect.arrayContaining(["direct_personal_attribute_copy"]));
    expect(consultation.requires_policy_review).toBe(true);

    const policy = await runCommercePolicyReview({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "policy_claims_ip_risk_checker",
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: "concept_behavioral_unsafe",
      content: unsafeCopy
    });
    expect(JSON.stringify(policy)).toContain("sensitive_personal_attribute");
    expect(JSON.stringify(policy)).toContain("protected_ip_term");
    expect(await repos.shopify.listByWorkspace(marketingWorkspaceId)).toHaveLength(0);
  });

  it("runs policy review against behavioral content even when launchPlanId is present", async () => {
    const repos = seedRepos();
    const fixture = await seedMarketingLaunchPlan({ repos });
    const unsafeCopy = "Are you a 40-year-old woman in Texas who needs this official Barbie-inspired dupe before it sells out?";

    const result = await runCommerceAgent({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "behavioral_psychology_customer_empathy",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId,
      audienceContext: "women 40+ in Texas as targeting context only",
      content: unsafeCopy,
      consultationType: "audience_ad_pdp_context"
    });

    expect(result.ok).toBe(true);
    expect(JSON.stringify(result.output)).toContain("policyReview");
    expect(JSON.stringify(result.output)).toContain("sensitive_personal_attribute");
    expect(JSON.stringify(result.output)).toContain("protected_ip_term");

    const policyReviews = await repos.marketing.policyReviewResults.listByWorkspace(marketingWorkspaceId);
    const behavioralPolicyReviews = policyReviews.filter((row) => row.target_type === "behavioral_consultation" || row.targetType === "behavioral_consultation");
    expect(behavioralPolicyReviews.length).toBeGreaterThan(0);
    expect(JSON.stringify(behavioralPolicyReviews)).toContain("sensitive_personal_attribute");
  });

  it("blocks shame, fear, and manipulative framing without diagnosing customers or Jennie", async () => {
    const repos = seedRepos();
    const result = await consultBehavioralPsychology({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "behavioral_psychology_customer_empathy",
      content: "Stop looking cheap and fix your insecurity before everyone notices.",
      audienceContext: "gift buyers"
    });
    const consultation = output(result);

    expect(consultation.sensitive_attribute_warnings).toContain("shame_fear_manipulation");
    expect(consultation.dark_pattern_risks).toContain("shame_fear_manipulation");
    expect(JSON.stringify(consultation)).not.toMatch(/Jennie.*diagnos|customer.*diagnos/i);
    expect(consultation.requires_policy_review).toBe(true);
  });
});
