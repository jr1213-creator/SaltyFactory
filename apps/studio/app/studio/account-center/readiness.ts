import { publicPrintifyProviderResolution, resolvePrintifyProvider } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import {
  createAccountCenterLaunchCards,
  createAgenticApprovalQueue,
  createMerchantProductFeedReadiness,
  createPrintifySetupState,
  createShopifySetupState,
  evaluateEmailReadiness,
  generateDnsReadinessRecords,
  runAgenticPodWorkflow
} from "@saltyfactory/domain";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import { getStudioLists, studioWorkspaceId } from "../data";

function providerKey(row: WorkspaceRow) {
  return String(row.provider_type ?? row.providerType ?? row.provider_key ?? row.providerKey ?? "");
}

function statusFor(connections: WorkspaceRow[], key: string) {
  return String(connections.find((row) => providerKey(row) === key)?.status ?? "not_configured");
}

function canOpenRepositories() {
  return process.env.NODE_ENV === "test" || process.env.REPOSITORY_ADAPTER === "memory" || Boolean(process.env.DATABASE_URL) || process.env.APP_ENV === "production";
}

async function resolvePrintifyRuntimeForAccountCenter(config: ReturnType<typeof parseEnv>) {
  if (!canOpenRepositories()) return null;
  try {
    return publicPrintifyProviderResolution(await resolvePrintifyProvider({ workspaceId: studioWorkspaceId, repos: createRepositories(), config }));
  } catch {
    return null;
  }
}

export async function getAccountCenterReadiness() {
  const config = parseEnv();
  const lists = await getStudioLists();
  const resolvedPrintifyRuntime = await resolvePrintifyRuntimeForAccountCenter(config);
  const printifyRuntime = resolvedPrintifyRuntime?.credentialSource === "credential_store" ? resolvedPrintifyRuntime : null;
  const latestBusinessProfile = (lists.businessProfiles[0] as any)?.profile_json ?? (lists.businessProfiles[0] as any)?.profileJson ?? lists.businessProfiles[0] ?? {};
  const workflowPreview = runAgenticPodWorkflow({
    trends: lists.trends,
    clusters: lists.clusters,
    businessProfile: latestBusinessProfile,
    channels: lists.channels,
    podCandidates: lists.podCandidates,
    listingDrafts: lists.listingDraftsV1,
    assets: lists.assets,
    mockups: lists.mockups,
    publishReviews: lists.publishReviews,
    aiOutputs: lists.aiEmployeeOutputs,
    shopifyStatus: statusFor(lists.providerConnections, "shopify"),
    printifyStatus: statusFor(lists.providerConnections, "printify"),
    googleStatus: statusFor(lists.providerConnections, "google_oauth"),
    merchantStatus: statusFor(lists.providerConnections, "google_merchant_center")
  });
  const approvalQueue = createAgenticApprovalQueue({
    agentOutputs: workflowPreview.outputs,
    aiOutputs: lists.aiEmployeeOutputs,
    podCandidates: lists.podCandidates,
    listingDrafts: lists.listingDraftsV1,
    assets: lists.assets,
    mockups: lists.mockups,
    publishReviews: lists.publishReviews
  });
  const dnsRecords = generateDnsReadinessRecords({
    domain: "saltycowhide.com",
    supportEmailDomain: "saltycowhide.com",
    shopifyCnameTarget: "shops.myshopify.com"
  });
  const emailReadiness = evaluateEmailReadiness({
    supportEmail: latestBusinessProfile.supportEmail ?? latestBusinessProfile.support_email,
    sendingDomain: "saltycowhide.com",
    spfVerified: false,
    dkimVerified: false,
    dmarcVerified: false,
    transactionalProviderConfigured: false,
    senderVerified: false
  });
  const productFeedReadiness = createMerchantProductFeedReadiness({
    merchantStatus: statusFor(lists.providerConnections, "google_merchant_center"),
    approvedListings: lists.listingDraftsV1.filter((draft: any) => draft.approval_status === "approved" || draft.approvalStatus === "approved").length,
    approvedMockups: lists.mockups.filter((mockup: any) => mockup.approved_for_product || mockup.approvedForProduct).length,
    pricesReady: lists.listingDraftsV1.some((draft: any) => Number(draft.price ?? draft.pricing?.salePrice ?? 0) > 0),
    shippingReady: Boolean(latestBusinessProfile.shippingRegions?.length || latestBusinessProfile.shipping_regions?.length),
    taxReady: false,
    policyReady: Boolean(latestBusinessProfile.returnsPolicyNotes || latestBusinessProfile.returns_policy_notes)
  });
  const shopifySetup = createShopifySetupState({
    enabled: config.SHOPIFY_ADMIN_ENABLED,
    storeDomain: config.SHOPIFY_STORE_DOMAIN,
    hasAdminToken: Boolean(config.SHOPIFY_ADMIN_TOKEN),
    hasClientCredentials: Boolean(config.SHOPIFY_CLIENT_ID && config.SHOPIFY_CLIENT_SECRET),
    persistedStatus: statusFor(lists.providerConnections, "shopify")
  });
  const printifySetupBase = createPrintifySetupState({
    enabled: printifyRuntime ? ["ready", "owner_gated", "invalid"].includes(printifyRuntime.status) : config.PRINTIFY_ENABLED,
    hasApiToken: printifyRuntime ? printifyRuntime.credentialSource === "credential_store" || printifyRuntime.status === "ready" : Boolean(config.PRINTIFY_API_TOKEN),
    shopId: printifyRuntime?.shopId ?? config.PRINTIFY_SHOP_ID,
    persistedStatus: printifyRuntime?.status === "ready" ? "connected" : statusFor(lists.providerConnections, "printify")
  });
  const printifySetup = printifyRuntime ? {
    ...printifySetupBase,
    setupRequired: printifyRuntime.status === "ready" ? [] : printifyRuntime.setupRequired,
    nextOwnerAction: printifyRuntime.status === "ready" ? "Review Printify catalog and map approved artwork to product targets." : printifyRuntime.safeMessage,
    connectionTestRequired: printifyRuntime.status !== "ready",
    checklist: printifySetupBase.checklist.map((item) => {
      if (item.label === "Generate API token" && printifyRuntime.credentialSource === "credential_store") {
        return { ...item, status: "detected" as const, ownerAction: "Token is saved in secure workspace credentials." };
      }
      if (item.label === "Select Printify shop" && printifyRuntime.shopId) {
        return { ...item, status: "detected" as const, ownerAction: `Selected shop: ${printifyRuntime.shopName ?? printifyRuntime.shopId}.` };
      }
      if (item.label === "Verify API connection" && printifyRuntime.status === "ready") {
        return { ...item, status: "connected" as const, ownerAction: "Printify connected through Launch Setup Concierge." };
      }
      return item;
    })
  } : printifySetupBase;
  const cards = createAccountCenterLaunchCards({
    businessProfileScore: Number((lists.businessProfiles[0] as any)?.readiness_score ?? (lists.businessProfiles[0] as any)?.readinessScore ?? 0),
    businessProfileStatus: String((lists.businessProfiles[0] as any)?.status ?? "setup_needed"),
    supportEmail: latestBusinessProfile.supportEmail ?? latestBusinessProfile.support_email,
    productionDisclosure: latestBusinessProfile.productionPartnerDisclosureNotes ?? latestBusinessProfile.production_partner_disclosure_notes,
    returnPolicy: latestBusinessProfile.returnsPolicyNotes ?? latestBusinessProfile.returns_policy_notes,
    shopifyStatus: shopifySetup.status,
    printifyStatus: printifySetup.status,
    googleOAuthStatus: statusFor(lists.providerConnections, "google_oauth"),
    ga4Status: statusFor(lists.providerConnections, "ga4"),
    searchConsoleStatus: statusFor(lists.providerConnections, "google_search_console"),
    merchantStatus: statusFor(lists.providerConnections, "google_merchant_center"),
    gbpStatus: statusFor(lists.providerConnections, "google_business_profile"),
    storageStatus: statusFor(lists.providerConnections, "supabase_storage"),
    trendReports: lists.aiEmployeeOutputs.filter((output: any) => (output.output_type ?? output.outputType) === "trend_report").length,
    productIdeas: lists.podCandidates.length,
    designConcepts: lists.briefs.length + lists.aiEmployeeOutputs.filter((output: any) => (output.output_type ?? output.outputType) === "design_concept").length,
    imagePrompts: lists.aiEmployeeOutputs.filter((output: any) => (output.output_type ?? output.outputType) === "image_generation_request").length,
    assets: lists.assets.length,
    approvedAssets: lists.assets.filter((asset: any) => asset.approved_for_mockup || asset.approvedForMockup).length,
    mockups: lists.mockups.length,
    approvedMockups: lists.mockups.filter((mockup: any) => mockup.approved_for_product || mockup.approvedForProduct).length,
    listingDrafts: lists.listingDraftsV1.length,
    approvalQueueItems: approvalQueue.length,
    baselineStatus: String((lists.baselines[0] as any)?.status ?? "missing"),
    aiEmployeesReady: lists.aiEmployees.filter((row: any) => ["ready", "active"].includes(row.status)).length,
    dnsRecords,
    emailReadiness,
    productFeedReadiness,
    lastChecked: new Date().toISOString()
  });
  return {
    lists,
    latestBusinessProfile,
    workflowPreview,
    approvalQueue,
    dnsRecords,
    emailReadiness,
    productFeedReadiness,
    shopifySetup,
    printifySetup,
    cards
  };
}
