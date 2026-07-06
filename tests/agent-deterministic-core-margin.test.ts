import { describe, expect, it } from "vitest";
import { calculateMarginEconomics } from "@saltyfactory/ai-free";
import { coreInput, createDeterministicCoreRepos, seedDeterministicDraft } from "./agent-deterministic-core-test-helpers";

describe("deterministic margin and offer economics core", () => {
  it("computes exact known margin dollars, percent, and break-even CPA", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "margin_exact", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await calculateMarginEconomics(coreInput(repos, fixture));

    expect(result.deterministic.margin_dollars).toBe(15.9);
    expect(result.deterministic.margin_pct).toBe(0.53);
    expect(result.deterministic.breakeven_cpa).toBe(15.9);
    expect(result.deterministic.missing_cost_data).toBe(false);
    expect(result.deterministic.floor_breach).toBe(false);
    expect(result.deterministic.paid_readiness).toBe("organic_only_recommended");
  });

  it("does not default missing costs to zero", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "margin_missing", price: "30.00", cost: null, shippingCost: null, paymentFee: null, platformFee: null });
    const result = await calculateMarginEconomics(coreInput(repos, fixture));

    expect(result.deterministic.missing_cost_data).toBe(true);
    expect(result.deterministic.margin_dollars).toBeNull();
    expect(result.deterministic.margin_pct).toBeNull();
    expect(result.deterministic.floor_breach).toBeNull();
    expect(result.deterministic.paid_readiness).toBe("unknown");
  });

  it("detects floor breach and blocks paid readiness when margin is too low", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "margin_floor", price: "15.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await calculateMarginEconomics(coreInput(repos, fixture));

    expect(result.deterministic.margin_dollars).toBe(0.9);
    expect(result.deterministic.floor_breach).toBe(true);
    expect(result.deterministic.paid_readiness).toBe("not_ready");
  });

  it("does not expose a negative break-even CPA when margin is negative", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "margin_negative", price: "10.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await calculateMarginEconomics(coreInput(repos, fixture));

    expect(result.deterministic.margin_dollars).toBe(-4.1);
    expect(result.deterministic.breakeven_cpa).toBe(0);
    expect(Number(result.marginAnalysis.breakeven_cpa ?? result.marginAnalysis.breakevenCpa)).toBe(0);
  });

  it("fails reconciliation when LLM narrative numbers disagree with deterministic margin", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "margin_llm_mismatch", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const result = await calculateMarginEconomics(coreInput(repos, fixture, { llmNarrative: "The profit margin is $99." }));

    expect(result.deterministic.reconciliation_status).toBe("failed");
    expect(result.marginAnalysis.reconciliation_status ?? result.marginAnalysis.reconciliationStatus).toBe("failed");
  });

  it("keeps deterministic fields identical across repeated runs", async () => {
    const repos = createDeterministicCoreRepos();
    const fixture = await seedDeterministicDraft({ repos, suffix: "margin_repeat", price: "30.00", cost: "8.00", shippingCost: "4.00", paymentFee: "1.20", platformFee: "0.90" });
    const runs = [];
    for (let index = 0; index < 3; index += 1) runs.push((await calculateMarginEconomics(coreInput(repos, fixture))).deterministic);
    expect(runs[1]).toEqual(runs[0]);
    expect(runs[2]).toEqual(runs[0]);
  });
});
