import { describe, expect, it } from "vitest";
import { designAssetSchema, productVariantSchema, trendSignalSchema } from "@saltyfactory/domain";
import { validDomainFixtures } from "./helpers";

describe("domain invalid shapes", () => {
  it("rejects invalid ID prefixes", () => {
    expect(trendSignalSchema.safeParse({ ...validDomainFixtures.trendSignal, id: "bad_01" }).success).toBe(false);
  });

  it("rejects invalid ISO dates", () => {
    expect(trendSignalSchema.safeParse({ ...validDomainFixtures.trendSignal, captured_at: "06/29/2026" }).success).toBe(false);
  });

  it("rejects invalid confidence values", () => {
    expect(trendSignalSchema.safeParse({ ...validDomainFixtures.trendSignal, confidence: 1.4 }).success).toBe(false);
  });

  it("rejects invalid money values", () => {
    expect(productVariantSchema.safeParse({ ...validDomainFixtures.productVariant, price: -1 }).success).toBe(false);
  });

  it("rejects invalid dimensions", () => {
    expect(designAssetSchema.safeParse({ ...validDomainFixtures.designAsset, width: 0 }).success).toBe(false);
  });
}
);
