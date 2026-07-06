import { describe, expect, it } from "vitest";
import {
  runCommerceAgent,
  runCommercePolicyReview
} from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";
import { marketingActorId, marketingWorkspaceId, seedMarketingLaunchPlan } from "./marketing-test-helpers";

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

describe("commerce agent safety boundaries", () => {
  it("drafts internal outputs without Shopify mutation, Printify call, HF call, image generation, spend, send, public post, product publish, or scraping", async () => {
    const repos = seedRepos();
    const fixture = await seedMarketingLaunchPlan({ repos });
    const before = {
      shopify: await repos.shopify.listByWorkspace(marketingWorkspaceId),
      printify: await repos.printify.listByWorkspace(marketingWorkspaceId),
      jobs: await repos.job.listByWorkspace(marketingWorkspaceId),
      assets: await repos.asset.listByWorkspace(marketingWorkspaceId),
      socialPublic: await repos.socialContent.listByWorkspace(marketingWorkspaceId),
      supportDrafts: await repos.support.drafts.listByWorkspace(marketingWorkspaceId),
      publish: await repos.publish.listByWorkspace(marketingWorkspaceId)
    };
    const base = {
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "organic_launch_planner",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    };

    await runCommerceAgent({ ...base, roleKey: "organic_launch_planner" });
    await runCommerceAgent({ ...base, roleKey: "social_repurposing" });
    await runCommerceAgent({ ...base, roleKey: "pinterest_organic" });
    await runCommerceAgent({ ...base, roleKey: "email_sms_draft" });
    await runCommerceAgent({ ...base, roleKey: "campaign_build_sheet" });
    const behavioral = await runCommerceAgent({
      ...base,
      roleKey: "behavioral_psychology_customer_empathy",
      audienceContext: "women 40+ in Texas as targeting context only",
      content: "For shoppers who love coastal western style, review the product before manual launch."
    });
    await runCommercePolicyReview({ ...base, roleKey: "policy_claims_ip_risk_checker" });

    expect(await repos.shopify.listByWorkspace(marketingWorkspaceId)).toEqual(before.shopify);
    expect(await repos.printify.listByWorkspace(marketingWorkspaceId)).toEqual(before.printify);
    expect(await repos.job.listByWorkspace(marketingWorkspaceId)).toEqual(before.jobs);
    expect(await repos.asset.listByWorkspace(marketingWorkspaceId)).toEqual(before.assets);
    expect(await repos.socialContent.listByWorkspace(marketingWorkspaceId)).toEqual(before.socialPublic);
    expect(await repos.support.drafts.listByWorkspace(marketingWorkspaceId)).toEqual(before.supportDrafts);
    expect(await repos.publish.listByWorkspace(marketingWorkspaceId)).toEqual(before.publish);

    const detail = await repos.marketing.organicContentDrafts.listByWorkspace(marketingWorkspaceId);
    expect(detail.length).toBeGreaterThan(0);
    expect(detail.every((draft) => draft.publish_approval_required === true || draft.publishApprovalRequired === true)).toBe(true);
    expect(JSON.stringify(behavioral.output)).toContain("policyReview");
    const policyReviews = await repos.marketing.policyReviewResults.listByWorkspace(marketingWorkspaceId);
    expect(policyReviews.some((row) => (row.target_type ?? row.targetType) === "behavioral_consultation")).toBe(true);
  });
});
