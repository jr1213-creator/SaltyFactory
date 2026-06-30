import { describe, expect, it } from "vitest";
import { evaluatePublishReviewGates } from "@saltyfactory/domain";
import { allTrueGates, validDomainFixtures } from "./helpers";

describe("publish gates single false", () => {
  it.each(Object.keys(allTrueGates))("%s false blocks Shopify", (gate) => {
    const gates = { ...allTrueGates, [gate]: false };
    const review = { ...validDomainFixtures.publishReview, gates, all_gates_passed: false, shopify_publish_allowed: false, printify_sync_allowed: false };
    expect(evaluatePublishReviewGates(review).shopifyAllowed).toBe(false);
  });

  it.each(Object.keys(allTrueGates))("%s false blocks Printify", (gate) => {
    const gates = { ...allTrueGates, [gate]: false };
    const review = { ...validDomainFixtures.publishReview, gates, all_gates_passed: false, shopify_publish_allowed: false, printify_sync_allowed: false };
    expect(evaluatePublishReviewGates(review).printifyAllowed).toBe(false);
  });
});
