import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { tables } from "@saltyfactory/db";

export const requiredTableExports = [
  "trendSources", "trendSignals", "trendClusters", "trendClusterSignals", "phraseCandidates", "riskReviews", "designBriefs", "generationJobs", "designAssets", "printFileQa", "mockupTemplates", "mockupAssets", "productDrafts", "productVariants", "productBatches", "productBatchItems", "priceMarginChecks", "publishReviews", "shopifyProductRefs", "printifyProductRefs", "fulfillmentEvents", "auditEvents",
  "users", "organizations", "organizationMembers", "workspaces", "workspaceBrandProfiles", "workspaceProviderConnections", "workspaceFeatureFlags", "workspaceSubscriptionStatus", "workspaceUsageEvents", "workspaceAuditEvents", "aiEmployees", "aiEmployeeTasks", "aiEmployeeRuns", "aiEmployeeOutputs", "aiEmployeePermissions", "aiEmployeeAuditEvents", "brandProfiles", "productCollectionPlans", "dropCalendars", "marketingAssets", "marketingCampaigns", "supportMacros", "customerSupportDrafts", "workspaceMetrics", "storefrontThemeSettings", "storefrontPages", "connectedStores", "providerConnectionStatus", "plans", "subscriptions", "billingEvents", "featureLimits"
];

describe("db schema exports", () => {
  it("exports every required table", () => {
    for (const table of requiredTableExports) expect(Object.keys(tables)).toContain(table);
  });

  it("does not export compact id-only tables", () => {
    for (const table of requiredTableExports) expect(Object.keys(getTableColumns(tables[table as keyof typeof tables]))).not.toEqual(["id"]);
  });
});
