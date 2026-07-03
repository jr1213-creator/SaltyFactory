export type UnitEconomicsInput = {
  salePrice?: number;
  productCost?: number;
  shippingCostEstimate?: number;
  platformFeeEstimate?: number;
  paymentFeeEstimate?: number;
  discountEstimate?: number;
  adSpendAllocationEstimate?: number;
  minimumMarginThreshold?: number;
};

const money = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateUnitEconomics(input: UnitEconomicsInput) {
  const salePrice = money(input.salePrice);
  const productCost = money(input.productCost);
  const shippingCostEstimate = money(input.shippingCostEstimate);
  const platformFeeEstimate = money(input.platformFeeEstimate);
  const paymentFeeEstimate = money(input.paymentFeeEstimate);
  const discountEstimate = money(input.discountEstimate);
  const adSpendAllocationEstimate = money(input.adSpendAllocationEstimate);
  const minimumMarginThreshold = money(input.minimumMarginThreshold || 35);
  const missing: string[] = [];
  if (salePrice <= 0) missing.push("sale_price_required");
  if (productCost <= 0) missing.push("product_cost_required");
  const contributionMargin = salePrice - productCost - shippingCostEstimate - platformFeeEstimate - paymentFeeEstimate - discountEstimate - adSpendAllocationEstimate;
  const contributionMarginPercent = salePrice > 0 ? (contributionMargin / salePrice) * 100 : 0;
  const breakEvenCac = Math.max(0, contributionMargin + adSpendAllocationEstimate);
  const breakEvenRoas = contributionMargin > 0 ? salePrice / contributionMargin : null;
  const status = missing.length ? "unknown" : contributionMarginPercent < minimumMarginThreshold || contributionMargin <= 0 ? "blocked" : contributionMarginPercent < minimumMarginThreshold + 10 ? "watch" : "healthy";
  return {
    salePrice: round(salePrice),
    productCost: round(productCost),
    shippingCostEstimate: round(shippingCostEstimate),
    platformFeeEstimate: round(platformFeeEstimate),
    paymentFeeEstimate: round(paymentFeeEstimate),
    discountEstimate: round(discountEstimate),
    adSpendAllocationEstimate: round(adSpendAllocationEstimate),
    contributionMargin: round(contributionMargin),
    contributionMarginPercent: round(contributionMarginPercent),
    breakEvenCac: round(breakEvenCac),
    breakEvenRoas: breakEvenRoas === null ? null : round(breakEvenRoas),
    minimumMarginThreshold: round(minimumMarginThreshold),
    status,
    blockers: missing.length ? missing : status === "blocked" ? ["margin_below_threshold"] : []
  };
}

export function calculateProductMarketingReadiness(input: { unitEconomicsStatus?: string; channel?: string }) {
  if (!input.unitEconomicsStatus || input.unitEconomicsStatus === "unknown") {
    return { readiness: "unknown", reasons: ["unit_economics_required"], requiredOwnerApproval: true };
  }
  if (input.unitEconomicsStatus === "blocked") {
    return { readiness: "blocked", reasons: ["margin_negative_or_below_threshold"], requiredOwnerApproval: true };
  }
  if (["google_ads", "meta_ads"].includes(String(input.channel ?? ""))) {
    return { readiness: "test_only", reasons: ["paid_spend_requires_owner_budget_approval"], requiredOwnerApproval: true };
  }
  return { readiness: "ready", reasons: ["unit_economics_acceptable"], requiredOwnerApproval: true };
}

export function maskSensitiveValue(value: string) {
  const clean = String(value || "").replace(/\D/g, "");
  if (!clean) return "stored_secret";
  return `${"*".repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}

export function redactBusinessSensitiveFields<T extends Record<string, unknown>>(row: T): T {
  const copy: Record<string, unknown> = { ...row };
  delete copy.einSecretRef;
  delete copy.ein_secret_ref;
  delete copy.secretRef;
  delete copy.secret_ref;
  delete copy.accessToken;
  delete copy.access_token;
  delete copy.plaidAccessToken;
  delete copy.plaid_access_token;
  return copy as T;
}
