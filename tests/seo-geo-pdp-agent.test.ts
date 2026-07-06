import { describe, expect, it } from "vitest";
import { draftSeoGeoPdpRecommendation } from "@saltyfactory/ai-free";
import { createMemoryRepositories, createRepositoryStore } from "../packages/db/src/repositories/memory";
import { marketingActorId, marketingWorkspaceId, seedMarketingLaunchPlan } from "./marketing-test-helpers";

function seedRepos() {
  return createMemoryRepositories(createRepositoryStore());
}

describe("SEO / GEO / PDP Optimization Agent", () => {
  it("produces search, AI-readable, FAQ, comparison, and PDP recommendations without keyword stuffing or Shopify mutation", async () => {
    const repos = seedRepos();
    const fixture = await seedMarketingLaunchPlan({ repos });
    const shopifyBefore = await repos.shopify.listByWorkspace(marketingWorkspaceId);

    const result = await draftSeoGeoPdpRecommendation({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: marketingActorId,
      roleKey: "seo_geo_pdp_optimization",
      launchPlanId: fixture.launchPlanId,
      sourceEntityType: "product_concept_candidate",
      sourceEntityId: fixture.conceptId
    });

    const output = result.output as Record<string, unknown>;
    expect(output.seo_title).toBeTruthy();
    expect(String(output.meta_description)).toContain("Giftable");
    expect(output.h1).toBeTruthy();
    expect(output.image_alt_text).toBeTruthy();
    expect(Array.isArray(output.internal_link_suggestions)).toBe(true);
    expect(output.ai_readable_product_summary).toBeTruthy();
    expect(output.answer_ready_product_facts).toEqual(expect.arrayContaining([expect.stringContaining("Owner-reviewed")]));
    expect(output.faq_block).toEqual(expect.arrayContaining(["Who is this for?"]));
    expect(output.comparison_bullets).toEqual(expect.arrayContaining(["No unsupported claims"]));
    expect(output.schema_recommendations).toEqual(expect.arrayContaining(["Product"]));
    expect(output.pdp_improvements).toEqual(expect.arrayContaining(["Clarify above-fold product type"]));

    const keywords = output.keyword_targeting as string[];
    expect(keywords.length).toBeLessThanOrEqual(8);
    expect(new Set(keywords.map((keyword) => keyword.toLowerCase())).size).toBe(keywords.length);

    const serialized = JSON.stringify(output).toLowerCase();
    expect(serialized).not.toMatch(/waterproof|genuine leather|guaranteed delivery|official|licensed/);

    const recommendations = await repos.commerceAgent.recommendations.listByWorkspace(marketingWorkspaceId);
    expect(recommendations.some((row) => row.recommendation_type === "seo_geo_pdp")).toBe(true);
    expect(await repos.shopify.listByWorkspace(marketingWorkspaceId)).toEqual(shopifyBefore);
  });
});
