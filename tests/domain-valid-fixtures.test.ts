import { describe, expect, it } from "vitest";
import {
  auditEventSchema,
  designAssetSchema,
  designBriefSchema,
  fulfillmentEventSchema,
  generationJobSchema,
  mockupAssetSchema,
  mockupTemplateSchema,
  phraseCandidateSchema,
  priceMarginCheckSchema,
  printFileQaSchema,
  printifyProductRefSchema,
  productDraftSchema,
  productVariantSchema,
  publishReviewSchema,
  riskReviewSchema,
  shopifyProductRefSchema,
  trendClusterSchema,
  trendClusterSignalSchema,
  trendSignalSchema,
  trendSourceSchema
} from "@saltyfactory/domain";
import { validDomainFixtures } from "./helpers";

const cases = [
  ["trendSource", trendSourceSchema, validDomainFixtures.trendSource],
  ["trendSignal", trendSignalSchema, validDomainFixtures.trendSignal],
  ["trendCluster", trendClusterSchema, validDomainFixtures.trendCluster],
  ["trendClusterSignal", trendClusterSignalSchema, validDomainFixtures.trendClusterSignal],
  ["phraseCandidate", phraseCandidateSchema, validDomainFixtures.phraseCandidate],
  ["riskReview", riskReviewSchema, validDomainFixtures.riskReview],
  ["designBrief", designBriefSchema, validDomainFixtures.designBrief],
  ["generationJob", generationJobSchema, validDomainFixtures.generationJob],
  ["designAsset", designAssetSchema, validDomainFixtures.designAsset],
  ["printFileQa", printFileQaSchema, validDomainFixtures.printFileQa],
  ["mockupTemplate", mockupTemplateSchema, validDomainFixtures.mockupTemplate],
  ["mockupAsset", mockupAssetSchema, validDomainFixtures.mockupAsset],
  ["productDraft", productDraftSchema, validDomainFixtures.productDraft],
  ["productVariant", productVariantSchema, validDomainFixtures.productVariant],
  ["priceMarginCheck", priceMarginCheckSchema, validDomainFixtures.priceMarginCheck],
  ["publishReview", publishReviewSchema, validDomainFixtures.publishReview],
  ["shopifyProductRef", shopifyProductRefSchema, validDomainFixtures.shopifyProductRef],
  ["printifyProductRef", printifyProductRefSchema, validDomainFixtures.printifyProductRef],
  ["fulfillmentEvent", fulfillmentEventSchema, validDomainFixtures.fulfillmentEvent],
  ["auditEvent", auditEventSchema, validDomainFixtures.auditEvent]
] as const;

describe("domain valid fixtures", () => {
  it.each(cases)("validates %s", (_name, schema, fixture) => {
    expect(schema.safeParse(fixture).success).toBe(true);
  });
});
