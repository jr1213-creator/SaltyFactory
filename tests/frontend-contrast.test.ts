import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { contrastRatio, runFrontendContrastAudit } from "../scripts/check-frontend-contrast";

describe("frontend token contrast", () => {
  it("keeps critical Studio and storefront token pairs at WCAG AA contrast", () => {
    const audit = runFrontendContrastAudit();

    expect(audit.passed).toBe(true);
    expect(audit.results).not.toEqual([]);
    for (const result of audit.results) {
      expect(result.ratio).toBeGreaterThanOrEqual(result.required);
    }
  });

  it("uses the standard WCAG contrast calculation", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5);
  });

  it("has a generated contrast report checked into docs", () => {
    expect(existsSync("docs/frontend-contrast-report-v1.md")).toBe(true);
  });
});
