import { describe, expect, it } from "vitest";
import { createSeoGeoPdpRecommendation, validateSeoGeoPdpDraft } from "@saltyfactory/ai-free";
import { coreInput, createDeterministicCoreRepos, deterministicWorkspaceId, seedDeterministicDraft } from "./agent-deterministic-core-test-helpers";

describe("deterministic SEO/GEO/PDP core", () => {
  it("detects over-limit title/meta before generated drafts are constrained", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "seo_limits", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const validation = await validateSeoGeoPdpDraft(coreInput(repos, fixture, {
      draft: {
        title_draft: "x".repeat(90),
        meta_description_draft: "y".repeat(180),
        ai_readable_summary: "coastal cowgirl pearl charm",
        faq_items: []
      }
    }));

    expect(validation.complianceChecklist.title_len_ok).toBe(false);
    expect(validation.complianceChecklist.meta_len_ok).toBe(false);

    const generated = await createSeoGeoPdpRecommendation(coreInput(repos, fixture));
    expect(generated.validation.complianceChecklist.title_len_ok).toBe(true);
    expect(generated.validation.complianceChecklist.meta_len_ok).toBe(true);
  });

  it("labels missing keyword data as directional and does not invent volume", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "seo_directional", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await createSeoGeoPdpRecommendation(coreInput(repos, fixture));
    const serialized = JSON.stringify(result.seoRecommendation).toLowerCase();
    expect(result.validation.complianceChecklist.keyword_data_source).toBe("directional");
    expect(result.seoRecommendation.keyword_data_source ?? result.seoRecommendation.keywordDataSource).toBe("directional");
    expect(serialized).not.toContain("search_volume");
    expect(serialized).not.toContain("monthly volume");
  });

  it("generates AI-readable summary, FAQ, comparison bullets, and schema recommendations", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "seo_outputs", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await createSeoGeoPdpRecommendation(coreInput(repos, fixture));
    expect(result.seoRecommendation.ai_readable_summary ?? result.seoRecommendation.aiReadableSummary).toContain("Coastal Cowgirl");
    expect(result.seoRecommendation.faq_items ?? result.seoRecommendation.faqItems).toEqual(expect.arrayContaining([expect.objectContaining({ question: expect.any(String) })]));
    expect(result.seoRecommendation.comparison_bullets ?? result.seoRecommendation.comparisonBullets).toEqual(expect.arrayContaining(["Original Salty Cowhide positioning"]));
    expect(result.seoRecommendation.schema_recommendations ?? result.seoRecommendation.schemaRecommendations).toEqual(expect.arrayContaining(["Product.name", "Product.description"]));
  });

  it("runs policy review on generated SEO/PDP copy and does not mutate Shopify", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "seo_policy", title: "Official Disney Charm", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const beforeShopify = await repos.shopify.listByWorkspace(deterministicWorkspaceId);
    const result = await createSeoGeoPdpRecommendation(coreInput(repos, fixture));
    const policy = await repos.marketing.policyReviewResults.getById(String(result.seoRecommendation.policy_review_id ?? result.seoRecommendation.policyReviewId), deterministicWorkspaceId);
    expect(policy?.blocked).toBe(true);
    expect(policy?.policy_codes ?? policy?.policyCodes).toEqual(expect.arrayContaining(["protected_ip_brand", "official_license_claim"]));
    expect(await repos.shopify.listByWorkspace(deterministicWorkspaceId)).toEqual(beforeShopify);
  });

  it("marks unsupported claims absent false when policy flags a medium unsupported claim", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "seo_unsupported_claim", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const validation = await validateSeoGeoPdpDraft(coreInput(repos, fixture, {
      draft: {
        title_draft: "Coastal Cowgirl Waterproof Charm",
        meta_description_draft: "Waterproof charm with boutique styling for owner review.",
        ai_readable_summary: "Waterproof charm summary.",
        faq_items: []
      }
    }));

    expect(validation.policy.result.risk_level).toBe("medium");
    expect(validation.policy.result.unsupported_claims).toHaveLength(1);
    expect(validation.complianceChecklist.unsupported_claims_absent).toBe(false);
  });
});
