import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { aiEmployeeRuns, productDrafts, publishReviews, trendSignals, workspaceProviderConnections } from "@saltyfactory/db";

const columnKeys = (table: Parameters<typeof getTableColumns>[0]) => Object.keys(getTableColumns(table));

describe("db schema key columns", () => {
  it("trend_signals includes production columns from architecture", () => {
    expect(columnKeys(trendSignals)).toEqual(expect.arrayContaining(["workspaceId", "sourceId", "sourceUrl", "capturedAt", "keyword", "relatedTerms", "category", "region", "season", "confidence", "allowedUse", "status", "clusterId", "notes", "createdAt", "updatedAt"]));
  });

  it("product_drafts includes full production draft columns", () => {
    expect(columnKeys(productDrafts)).toEqual(expect.arrayContaining(["workspaceId", "brand", "title", "description", "productType", "collection", "tags", "briefId", "assetId", "mockupIds", "variantIds", "shopifyStatus", "printifyStatus", "approvalStatus", "approvedBy", "approvedAt", "publishReviewId"]));
  });

  it("publish_reviews includes all gate fields", () => {
    expect(columnKeys(publishReviews)).toEqual(expect.arrayContaining(["workspaceId", "productDraftId", "gates", "allGatesPassed", "shopifyPublishAllowed", "printifySyncAllowed", "reviewedBy", "reviewedAt", "notes"]));
  });

  it("ai_employee_runs includes required run fields", () => {
    expect(columnKeys(aiEmployeeRuns)).toEqual(expect.arrayContaining(["workspaceId", "employeeType", "taskType", "inputRefType", "inputRefId", "status", "providerUsed", "modelUsed", "promptRef", "outputJson", "blockedReasons", "requiresHumanReview", "approvedBy", "approvedAt"]));
  });

  it("workspace_provider_connections uses secret references", () => {
    const columns = columnKeys(workspaceProviderConnections);
    expect(columns).toEqual(expect.arrayContaining(["workspaceId", "providerType", "providerName", "enabled", "status", "secretRef", "lastHealthCheckAt", "lastHealthCheckStatus", "configuration"]));
    expect(columns.join(" ").toLowerCase()).not.toMatch(/token|api_key|apikey|password/);
  });
});
