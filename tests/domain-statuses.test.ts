import { describe, expect, it } from "vitest";
import {
  designBriefSchema,
  fulfillmentEventSchema,
  generationJobSchema,
  phraseCandidateSchema,
  productDraftSchema,
  riskReviewSchema,
  trendClusterSchema,
  trendSignalSchema
} from "@saltyfactory/domain";
import { validDomainFixtures } from "./helpers";

const statusCases = [
  [trendSignalSchema, validDomainFixtures.trendSignal],
  [trendClusterSchema, validDomainFixtures.trendCluster],
  [phraseCandidateSchema, validDomainFixtures.phraseCandidate],
  [riskReviewSchema, validDomainFixtures.riskReview],
  [designBriefSchema, validDomainFixtures.designBrief],
  [generationJobSchema, validDomainFixtures.generationJob],
  [productDraftSchema, validDomainFixtures.productDraft],
  [fulfillmentEventSchema, validDomainFixtures.fulfillmentEvent]
] as const;

describe("domain status enums", () => {
  it.each(statusCases)("rejects invalid status", (schema, fixture) => {
    expect(schema.safeParse({ ...fixture, status: "whatever" }).success).toBe(false);
  });
});
