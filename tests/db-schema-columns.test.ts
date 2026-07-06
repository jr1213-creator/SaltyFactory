import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import {
  adAngles,
  adCopyVariants,
  aiEmployeeRuns,
  aiEmployeeTranscriptEvents,
  audienceHypotheses,
  brandVoiceProfiles,
  budgetRecommendations,
  campaignApprovalRequests,
  campaignDrafts,
  channelRecommendations,
  creativeBriefs,
  lifecycleCampaignFlows,
  landingPageRecommendations,
  marketingLaunchPlans,
  marketingSourceRuns,
  marketingSources,
  mediaPlanDrafts,
  offerHypotheses,
  organicContentDrafts,
  policyReviewResults,
  positioningStatements,
  printifyProductRefs,
  productBatchItems,
  productBatches,
  productConceptCandidates,
  productDrafts,
  productMarketingReadiness,
  publishReviews,
  rejectedSignals,
  shopifyProductRefs,
  sourceCitations,
  trendAnalysisReports,
  trendClusters,
  trendScores,
  trendSignalRuns,
  trendSignals,
  trendSources,
  trendWatchProfiles,
  workspaceProviderConnections
} from "@saltyfactory/db";

const columnKeys = (table: Parameters<typeof getTableColumns>[0]) => Object.keys(getTableColumns(table));

describe("db schema key columns", () => {
  it("trend_signals includes production columns from architecture", () => {
    expect(columnKeys(trendSignals)).toEqual(expect.arrayContaining(["workspaceId", "sourceId", "profileId", "runId", "sourceKey", "signalType", "rawValue", "normalizedKeyword", "normalizedTitle", "normalizedTags", "normalizedMotifTags", "metricValue", "metricType", "priceValue", "priceCurrency", "observedAt", "citationUrl", "sourceUrl", "capturedAt", "keyword", "relatedTerms", "category", "region", "season", "confidence", "allowedUse", "status", "clusterId", "riskFlags", "notes", "createdAt", "updatedAt"]));
  });

  it("trend intelligence tables include profile, source, run, citation, and rejection columns", () => {
    expect(columnKeys(trendWatchProfiles)).toEqual(expect.arrayContaining(["workspaceId", "nicheName", "targetCustomer", "productCategories", "keywords", "seedPhrases", "excludedTerms", "visualMotifs", "brandPalette", "allowedSources", "sourceWeights", "freshnessWindowDays", "minSignalThreshold", "isActive"]));
    expect(columnKeys(trendSources)).toEqual(expect.arrayContaining(["workspaceId", "sourceKey", "displayName", "accessMode", "capabilities", "authStatus", "approvalStatus", "riskLevel", "commercialUseAllowed", "requiresCredential", "requiresApproval", "isEnabled", "isTrusted", "allowedUseNotes", "lastSuccessfulFetchAt"]));
    expect(columnKeys(trendSignalRuns)).toEqual(expect.arrayContaining(["workspaceId", "profileId", "sourceId", "sourceKey", "status", "failureCode", "startedAt", "completedAt", "rawSignalCount", "normalizedSignalCount", "citationCount"]));
    expect(columnKeys(trendClusters)).toEqual(expect.arrayContaining(["workspaceId", "profileId", "label", "summary", "memberSignalIds", "sourceKeys", "keywordTerms", "motifTerms", "citationIds", "signalCount", "crossSourceCount", "firstObservedAt", "lastObservedAt", "createdByKind"]));
    expect(columnKeys(trendScores)).toEqual(expect.arrayContaining(["workspaceId", "profileId", "clusterId", "totalScore", "confidenceScore", "componentScores", "reasons", "warnings", "riskFlags", "recommendedAction"]));
    expect(columnKeys(trendAnalysisReports)).toEqual(expect.arrayContaining(["workspaceId", "profileId", "agentRunId", "sourceSignalCount", "clusterCount", "conceptCandidateCount", "summary", "warnings", "status"]));
    expect(columnKeys(productConceptCandidates)).toEqual(expect.arrayContaining(["workspaceId", "profileId", "clusterId", "trendScoreId", "title", "customerSegment", "productCategory", "suggestedProductTypes", "personalizationPotential", "phrases", "visualMotifs", "palette", "printStyle", "recommendedBlankOrBaseProduct", "marginHypothesis", "sourceEvidence", "reasonItMaySell", "riskNotes", "ownerActionNeeded", "reviewStatus", "createdByKind"]));
    expect(columnKeys(sourceCitations)).toEqual(expect.arrayContaining(["workspaceId", "entityType", "entityId", "sourceId", "sourceKey", "citationUrl", "capturedAt", "rawSnapshot"]));
    expect(columnKeys(rejectedSignals)).toEqual(expect.arrayContaining(["workspaceId", "signalId", "rejectedBy", "reason", "rejectedAt"]));
  });

  it("marketing launch planning tables include source registry, launch, policy, and approval columns", () => {
    expect(columnKeys(brandVoiceProfiles)).toEqual(expect.arrayContaining(["workspaceId", "brandName", "toneDescriptors", "vocabularyPreferences", "bannedPhrases", "approvedPhrases", "exampleApprovedCopy", "claimRules", "ipBlocklist"]));
    expect(columnKeys(marketingSources)).toEqual(expect.arrayContaining(["workspaceId", "sourceKey", "displayName", "sourceType", "credentialStatus", "accessMode", "capabilities", "isEnabled", "isTrusted", "riskLevel", "lastSyncAt", "lastError", "accessNotes"]));
    expect(columnKeys(marketingSourceRuns)).toEqual(expect.arrayContaining(["workspaceId", "sourceKey", "status", "failureCode", "recordsRead", "startedAt", "completedAt"]));
    expect(columnKeys(productMarketingReadiness)).toEqual(expect.arrayContaining(["workspaceId", "sourceEntityType", "sourceEntityId", "titlePresent", "descriptionPresent", "pricePresent", "mockupPresent", "assetStatus", "variantStatus", "costPresent", "estimatedMargin", "shippingAssumptionStatus", "pdpUrl", "policyStatus", "ipRiskStatus", "marketabilityScore", "blockers", "warnings"]));
    expect(columnKeys(marketingLaunchPlans)).toEqual(expect.arrayContaining(["workspaceId", "sourceEntityType", "sourceEntityId", "brandVoiceProfileId", "readinessId", "launchName", "campaignType", "spendType", "estimatedCashCost", "ownerTimeEstimateMinutes", "requiresAdBudget", "status", "summary"]));
    expect(columnKeys(positioningStatements)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "primaryPromise", "customerMoment", "differentiators", "objections", "evidenceRefs", "riskFlags", "reviewStatus"]));
    expect(columnKeys(offerHypotheses)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "offerType", "offerDetails", "marginCalculation", "riskFlags", "reviewStatus"]));
    expect(columnKeys(audienceHypotheses)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "channel", "segmentName", "description", "rationale", "targetingParameters", "exclusionRules", "sensitiveTargetingFlags", "evidenceRefs", "reviewStatus"]));
    expect(columnKeys(adAngles)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "angleType", "angleTitle", "hook", "promise", "proofPoints", "trendEvidenceRefs", "riskFlags", "reviewStatus"]));
    expect(columnKeys(adCopyVariants)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "adAngleId", "channel", "headline", "primaryText", "description", "cta", "platformConstraints", "policyReviewResultId", "reviewStatus"]));
    expect(columnKeys(organicContentDrafts)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "contentType", "payload", "estimatedCashCost", "ownerTimeEstimateMinutes", "publishApprovalRequired", "sendApprovalRequired", "outreachApprovalRequired", "policyReviewResultId", "reviewStatus"]));
    expect(columnKeys(lifecycleCampaignFlows)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "flowTrigger", "sequenceStep", "subjectLine", "previewText", "bodyMarkdown", "smsVariantText", "segmentNotes", "consentRequired", "sendStatus"]));
    expect(columnKeys(creativeBriefs)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "adAngleId", "creativeType", "promptOrBrief", "textOverlay", "aspectRatio", "assetRequirements", "sourceEvidenceRefs", "forbiddenMotifs", "notCopyingWarning", "policyReviewResultId", "reviewStatus"]));
    expect(columnKeys(landingPageRecommendations)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "sourceEntityType", "sourceEntityId", "recommendationType", "beforeText", "afterText", "supportingMetrics", "expectedImpact", "riskFlags", "reviewStatus"]));
    expect(columnKeys(channelRecommendations)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "channel", "priorityScore", "rationale", "requiredAssets", "cashCostEstimate", "ownerTimeEstimateMinutes", "riskFlags", "reviewStatus"]));
    expect(columnKeys(policyReviewResults)).toEqual(expect.arrayContaining(["workspaceId", "targetType", "targetId", "platform", "verdict", "severity", "policyCodes", "evidence", "fixSuggestions", "ownerOverride", "blocked"]));
    expect(columnKeys(budgetRecommendations)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "recommendedDailyBudget", "recommendedTotalTestBudget", "breakEvenCpa", "targetCpa", "calculationBasis", "riskFlags", "requiresApproval", "reviewStatus"]));
    expect(columnKeys(mediaPlanDrafts)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "objective", "campaignType", "spendType", "channelAllocations", "totalBudgetRecommended", "dailyBudgetCap", "breakEvenCpa", "testDurationDays", "status"]));
    expect(columnKeys(campaignDrafts)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "mediaPlanDraftId", "platform", "campaignName", "objective", "platformObjectStructure", "platformObjectIds", "writeMode", "utmSchema", "riskSummary", "approvalStatus"]));
    expect(columnKeys(campaignApprovalRequests)).toEqual(expect.arrayContaining(["workspaceId", "launchPlanId", "targetType", "targetId", "requestedAction", "riskSummary", "ownerDecision", "reviewer", "decidedAt", "notes"]));
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
