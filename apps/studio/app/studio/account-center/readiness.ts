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
import type { WorkspaceRow } from "@saltyfactory/db";
import { getStudioLists } from "../data";

function providerKey(row: WorkspaceRow) {
  return String(row.provider_type ?? row.providerType ?? row.provider_key ?? row.providerKey ?? "");
}

function statusFor(connections: WorkspaceRow[], key: string) {
  return String(connections.find((row) => providerKey(row) === key)?.status ?? "not_configured");
}

export async function getAccountCenterReadiness() {
  const config = parseEnv();
  const lists = await getStudioLists();
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
    persistedStatus: statusFor(lists.providerConnections, "shopify")
  });
  const printifySetup = createPrintifySetupState({
    enabled: config.PRINTIFY_ENABLED,
    hasApiToken: Boolean(config.PRINTIFY_API_TOKEN),
    shopId: config.PRINTIFY_SHOP_ID,
    persistedStatus: statusFor(lists.providerConnections, "printify")
  });
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
    config,
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
