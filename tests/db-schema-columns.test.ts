import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { aiEmployeeRuns, aiEmployeeTranscriptEvents, printifyProductRefs, productBatchItems, productBatches, productDrafts, publishReviews, rejectedSignals, shopifyProductRefs, sourceCitations, trendSignalRuns, trendSignals, trendSources, trendWatchProfiles, workspaceProviderConnections } from "@saltyfactory/db";

const columnKeys = (table: Parameters<typeof getTableColumns>[0]) => Object.keys(getTableColumns(table));

describe("db schema key columns", () => {
  it("trend_signals includes production columns from architecture", () => {
    expect(columnKeys(trendSignals)).toEqual(expect.arrayContaining(["workspaceId", "sourceId", "profileId", "runId", "sourceKey", "signalType", "rawValue", "normalizedKeyword", "normalizedTitle", "normalizedTags", "normalizedMotifTags", "metricValue", "metricType", "priceValue", "priceCurrency", "observedAt", "citationUrl", "sourceUrl", "capturedAt", "keyword", "relatedTerms", "category", "region", "season", "confidence", "allowedUse", "status", "clusterId", "riskFlags", "notes", "createdAt", "updatedAt"]));
  });

  it("trend intelligence tables include profile, source, run, citation, and rejection columns", () => {
    expect(columnKeys(trendWatchProfiles)).toEqual(expect.arrayContaining(["workspaceId", "nicheName", "targetCustomer", "productCategories", "keywords", "seedPhrases", "excludedTerms", "visualMotifs", "brandPalette", "allowedSources", "sourceWeights", "freshnessWindowDays", "minSignalThreshold", "isActive"]));
    expect(columnKeys(trendSources)).toEqual(expect.arrayContaining(["workspaceId", "sourceKey", "displayName", "accessMode", "capabilities", "authStatus", "approvalStatus", "riskLevel", "commercialUseAllowed", "requiresCredential", "requiresApproval", "isEnabled", "isTrusted", "allowedUseNotes", "lastSuccessfulFetchAt"]));
    expect(columnKeys(trendSignalRuns)).toEqual(expect.arrayContaining(["workspaceId", "profileId", "sourceId", "sourceKey", "status", "failureCode", "startedAt", "completedAt", "rawSignalCount", "normalizedSignalCount", "citationCount"]));
    expect(columnKeys(sourceCitations)).toEqual(expect.arrayContaining(["workspaceId", "entityType", "entityId", "sourceId", "sourceKey", "citationUrl", "capturedAt", "rawSnapshot"]));
    expect(columnKeys(rejectedSignals)).toEqual(expect.arrayContaining(["workspaceId", "signalId", "rejectedBy", "reason", "rejectedAt"]));
  });

  it("product_drafts includes full production draft columns", () => {
    expect(columnKeys(productDrafts)).toEqual(expect.arrayContaining(["workspaceId", "brand", "title", "description", "productType", "collection", "tags", "briefId", "assetId", "mockupIds", "variantIds", "shopifyStatus", "printifyStatus", "approvalStatus", "approvedBy", "approvedAt", "publishReviewId"]));
  });

  it("publish_reviews includes all gate fields", () => {
    expect(columnKeys(publishReviews)).toEqual(expect.arrayContaining(["workspaceId", "productDraftId", "gates", "allGatesPassed", "shopifyPublishAllowed", "printifySyncAllowed", "reviewedBy", "reviewedAt", "notes"]));
  });

  it("provider refs include source-of-truth mapping and sync fields", () => {
    expect(columnKeys(shopifyProductRefs)).toEqual(expect.arrayContaining(["productDraftId", "shopifyProductId", "shopifyProductGid", "shopifyHandle", "adminUrl", "storefrontUrl", "media", "seo", "syncStatus", "lastError", "sourceRecordId"]));
    expect(columnKeys(printifyProductRefs)).toEqual(expect.arrayContaining(["productDraftId", "printifyProductId", "printifyShopId", "printifyBlueprintId", "printifyPrintProviderId", "printifyUploadId", "printifyVariantIds", "printAreas", "mockupUrls", "syncStatus", "lastError", "sourceRecordId"]));
  });

  it("product batch tables support 15 item workflow stages", () => {
    expect(columnKeys(productBatches)).toEqual(expect.arrayContaining(["workspaceId", "name", "targetCount", "trendSource", "productMix", "status", "progress", "blockedReasons", "lastError"]));
    expect(columnKeys(productBatchItems)).toEqual(expect.arrayContaining(["workspaceId", "batchId", "productDraftId", "sequence", "stage", "status", "blockers", "retryCount", "lastError", "stageHistory"]));
  });

  it("ai_employee_runs includes required run fields", () => {
    expect(columnKeys(aiEmployeeRuns)).toEqual(expect.arrayContaining(["workspaceId", "employeeType", "taskType", "inputRefType", "inputRefId", "status", "providerUsed", "modelUsed", "promptRef", "outputJson", "blockedReasons", "requiresHumanReview", "approvedBy", "approvedAt"]));
  });

  it("ai_employee_transcript_events stores visible agent proof events", () => {
    expect(columnKeys(aiEmployeeTranscriptEvents)).toEqual(expect.arrayContaining(["workspaceId", "runId", "turnIndex", "eventType", "role", "toolName", "content", "metadata"]));
  });

  it("workspace_provider_connections uses secret references", () => {
    const columns = columnKeys(workspaceProviderConnections);
    expect(columns).toEqual(expect.arrayContaining(["workspaceId", "providerType", "providerName", "enabled", "status", "secretRef", "lastHealthCheckAt", "lastHealthCheckStatus", "configuration"]));
    expect(columns.join(" ").toLowerCase()).not.toMatch(/token|api_key|apikey|password/);
  });
});
