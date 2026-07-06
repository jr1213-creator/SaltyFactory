import { describe, expect, it } from "vitest";
import { createMemoryRepositories, type WorkspaceRow } from "../packages/db/src/repositories/memory";
import {
  createApprovalRequest,
  decideMarketingApprovalRequest,
  runPolicyReview
} from "@saltyfactory/ai-free";
import {
  marketingActorId,
  marketingWorkspaceId,
  seedMarketingLaunchPlan
} from "./marketing-test-helpers";

describe("marketing policy and risk review", () => {
  it("blocks unsupported claims, personal-attribute targeting, fake urgency, and IP references with fix suggestions", async () => {
    const repos = createMemoryRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });

    await repos.marketing.adCopyVariants.create({
      id: "adcopy_policy_seed",
      workspace_id: marketingWorkspaceId,
      launch_plan_id: fixture.launchPlanId,
      channel: "meta",
      headline: "Only 3 left for anxious Disney fans",
      primary_text: "Free shipping on this genuine leather charm. Everyone is buying this 50% off Taylor Swift boutique drop.",
      description: "Official 5-star customer favorite for people with diabetes.",
      cta: "Shop now",
      platform_constraints: {},
      policy_review_result_id: null,
      review_status: "pending_review",
      created_by: marketingActorId,
      updated_by: marketingActorId
    } as WorkspaceRow);

    await repos.marketing.creativeBriefs.create({
      id: "creative_policy_seed",
      workspace_id: marketingWorkspaceId,
      launch_plan_id: fixture.launchPlanId,
      ad_angle_id: null,
      creative_type: "static_ad",
      prompt_or_brief: "Use a Disney princess vibe with official NFL energy and handmade genuine leather copy.",
      text_overlay: "Ends in 5 minutes",
      aspect_ratio: "4:5",
      asset_requirements: {},
      source_evidence_refs: ["https://example.com/evidence"],
      forbidden_motifs: [],
      not_copying_warning: "Do not copy competitor ads.",
      policy_review_result_id: null,
      review_status: "pending_review",
      created_by: marketingActorId,
      updated_by: marketingActorId
    } as WorkspaceRow);

    const result = await runPolicyReview({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      launchPlanId: fixture.launchPlanId
    });

    expect(result.policyReviewCount).toBeGreaterThanOrEqual(2);
    expect(result.blockedCount).toBeGreaterThanOrEqual(2);

    const adCopy = await repos.marketing.adCopyVariants.getById("adcopy_policy_seed", marketingWorkspaceId);
    const creativeBrief = await repos.marketing.creativeBriefs.getById("creative_policy_seed", marketingWorkspaceId);
    const adPolicy = await repos.marketing.policyReviewResults.getById(String(adCopy?.policy_review_result_id), marketingWorkspaceId);
    const creativePolicy = await repos.marketing.policyReviewResults.getById(String(creativeBrief?.policy_review_result_id), marketingWorkspaceId);

    expect(adPolicy).toMatchObject({
      verdict: "hard_block",
      blocked: true
    });
    expect(adPolicy?.policy_codes ?? adPolicy?.policyCodes).toEqual(expect.arrayContaining([
      "ip_or_trademark_reference",
      "personal_attribute_targeting",
      "fake_urgency_or_scarcity",
      "fake_review_or_testimonial",
      "false_material_claim",
      "discount_or_shipping_claim_unverified"
    ]));
    expect(Array.isArray(adPolicy?.fix_suggestions ?? adPolicy?.fixSuggestions)).toBe(true);
    expect(creativePolicy).toMatchObject({
      verdict: "hard_block",
      blocked: true
    });
  });

  it("refuses approval of ad copy that does not have a passing policy review", async () => {
    const repos = createMemoryRepositories();
    const fixture = await seedMarketingLaunchPlan({ repos });

    await repos.marketing.adCopyVariants.create({
      id: "adcopy_needs_policy",
      workspace_id: marketingWorkspaceId,
      launch_plan_id: fixture.launchPlanId,
      channel: "meta",
      headline: "Only 3 left",
      primary_text: "Official Disney favorite.",
      description: null,
      cta: "Shop",
      platform_constraints: {},
      policy_review_result_id: null,
      review_status: "pending_review",
      created_by: marketingActorId,
      updated_by: marketingActorId
    } as WorkspaceRow);

    await runPolicyReview({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      launchPlanId: fixture.launchPlanId
    });
    const approval = await createApprovalRequest({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      launchPlanId: fixture.launchPlanId,
      targets: [{ targetType: "ad_copy_variant", targetId: "adcopy_needs_policy" }]
    });

    await expect(decideMarketingApprovalRequest({
      repos,
      workspaceId: marketingWorkspaceId,
      approvalRequestId: approval.approvalRequestIds[0]!,
      ownerDecision: "approved",
      reviewer: "owner@saltycowhide.com",
      actorId: marketingActorId
    })).rejects.toThrow("policy_review_required");
  });
});
