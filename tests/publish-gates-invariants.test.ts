import { describe, expect, it } from "vitest";
import { assertPublishAllowedForPrintify, assertPublishAllowedForShopify, evaluatePublishReviewGates, publishReviewSchema } from "@saltyfactory/domain";
import { allTrueGates, validDomainFixtures } from "./helpers";

describe("publish gate invariants", () => {
  it("human approval false blocks both providers", () => {
    const review = { ...validDomainFixtures.publishReview, gates: { ...allTrueGates, human_approved: false }, all_gates_passed: false, shopify_publish_allowed: false, printify_sync_allowed: false };
    expect(() => assertPublishAllowedForShopify(review)).toThrow();
    expect(() => assertPublishAllowedForPrintify(review)).toThrow();
  });

  it("inconsistent allowed flag true is rejected", () => {
    const review = { ...validDomainFixtures.publishReview, gates: { ...allTrueGates, title_reviewed: false }, all_gates_passed: false, shopify_publish_allowed: true, printify_sync_allowed: true };
    expect(publishReviewSchema.safeParse(review).success).toBe(false);
    expect(evaluatePublishReviewGates(review).inconsistent).toBe(true);
  });

  it("all gates true permits only guarded action readiness", () => {
    const review = { ...validDomainFixtures.publishReview, gates: allTrueGates, all_gates_passed: true, shopify_publish_allowed: true, printify_sync_allowed: true };
    expect(evaluatePublishReviewGates(review)).toMatchObject({ allowed: true, shopifyAllowed: true, printifyAllowed: true });
  });
});
