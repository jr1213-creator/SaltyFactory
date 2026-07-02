import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import { buildReadinessScore, buildUtmUrl, safeKernelRecordForClient } from "@saltyfactory/domain";
import { classifyStudioDataError, studioWorkspaceId } from "../data";

const setupMessages: Record<string, string> = {
  schema_incomplete: "Database schema incomplete. Apply migrations to enable Marketing Command Center.",
  database_not_configured: "Studio database is not configured. Set DATABASE_URL for the Studio runtime.",
  database_unreachable: "Studio database is configured but unreachable.",
  database_permission_denied: "Studio database access is blocked.",
  workspace_setup_required: "Studio workspace setup is incomplete.",
  data_unavailable: "Marketing Command Center data is unavailable. Check database access and workspace setup."
};

export const marketingChannelLabels: Record<string, string> = {
  pinterest: "Pinterest Pin",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  threads: "Threads",
  linkedin: "LinkedIn",
  google_business_profile: "Google Business Profile",
  bluesky: "Bluesky",
  email: "Email Draft",
  google_ads: "Google Ads Draft",
  meta_ads: "Meta Ads Draft",
  seo_geo: "SEO/AEO/GEO",
  asset: "Asset Spec",
  other: "Other"
};

export function marketingRowsByChannel(channels: WorkspaceRow[], channelType: string) {
  return channels.filter((row) => String(row.channel_type ?? row.channelType ?? "") === channelType);
}

function statusCount(rows: WorkspaceRow[], status: string) {
  return rows.filter((row) => String(row.status ?? "draft") === status).length;
}

function providerStatus(connections: WorkspaceRow[], provider: string) {
  const row = connections.find((item) => String(item.provider ?? item.provider_key ?? item.providerKey ?? "") === provider);
  return String(row?.status ?? "not_configured");
}

function redacted<T extends WorkspaceRow>(rows: T[]) {
  return rows.map((row) => safeKernelRecordForClient(row as Record<string, unknown>) as T);
}

function emptyMarketingCommandCenterState(setupKind = "", setupMessage = "") {
  return {
    ok: false as const,
    setupKind,
    setupMessage,
    campaigns: [] as WorkspaceRow[],
    channels: [] as WorkspaceRow[],
    proofPacks: [] as WorkspaceRow[],
    growthPlans: [] as WorkspaceRow[],
    exportPackages: [] as WorkspaceRow[],
    readinessScores: [] as WorkspaceRow[],
    approvals: [] as WorkspaceRow[],
    aiOutputApprovals: [] as WorkspaceRow[],
    tasks: [] as WorkspaceRow[],
    recommendations: [] as WorkspaceRow[],
    assets: [] as WorkspaceRow[],
    utmLinks: [] as WorkspaceRow[],
    sourceRecords: [] as WorkspaceRow[],
    templates: [] as WorkspaceRow[],
    verticalPacks: [] as WorkspaceRow[],
    providerConnections: [] as WorkspaceRow[],
    providerStatuses: { google_ads: "not_configured", meta: "not_configured", pinterest: "not_configured", email: "not_configured", analytics: "not_configured" },
    summary: {
      campaigns: 0,
      draftCampaigns: 0,
      activeCampaigns: 0,
      proofPacks: 0,
      growthPlans: 0,
      adReadinessScores: 0,
      pinterestDrafts: 0,
      socialDrafts: 0,
      emailDrafts: 0,
      googleAdDrafts: 0,
      metaAdDrafts: 0,
      assetSpecs: 0,
      utmLinks: 0,
      researchItems: 0,
      approvalItems: 0,
      exportReadyItems: 0,
      unifiedReadiness: buildReadinessScore({
        workspaceId: studioWorkspaceId,
        entityType: "marketing",
        entityId: studioWorkspaceId,
        scoreType: "campaign",
        criteria: [{ key: "records", label: "Create first marketing campaign", passed: false, blocker: "No persisted campaign records yet." }]
      })
    }
  };
}

export async function getMarketingCommandCenterData() {
  const memoryAllowed = process.env.NODE_ENV === "test" || process.env.REPOSITORY_ADAPTER === "memory";
  if (!process.env.DATABASE_URL && !memoryAllowed) return emptyMarketingCommandCenterState("database_not_configured", setupMessages.database_not_configured);
  try {
    const repos = createRepositories();
    const [
      campaigns,
      channels,
      exportPackages,
      readinessScores,
      approvals,
      tasks,
      recommendations,
      assets,
      utmLinks,
      sourceRecords,
      templates,
      verticalPacks,
      providerConnections,
      aiOutputs
    ] = await Promise.all([
      repos.shared.campaigns.listByWorkspace(studioWorkspaceId),
      repos.shared.campaignChannels.listByWorkspace(studioWorkspaceId),
      repos.shared.exportPackages.listByWorkspace(studioWorkspaceId),
      repos.shared.readinessScores.listByWorkspace(studioWorkspaceId),
      repos.shared.approvals.listByWorkspace(studioWorkspaceId),
      repos.shared.tasks.listByWorkspace(studioWorkspaceId),
      repos.shared.recommendations.listByWorkspace(studioWorkspaceId),
      repos.shared.assets.listByWorkspace(studioWorkspaceId),
      repos.shared.utmLinks.listByWorkspace(studioWorkspaceId),
      repos.shared.sourceRecords.listByWorkspace(studioWorkspaceId),
      repos.shared.templates.listByWorkspace(studioWorkspaceId),
      repos.shared.verticalPacks.list(),
      repos.shared.providerConnections.listByWorkspace(studioWorkspaceId),
      repos.aiEmployee.outputs.listByWorkspace(studioWorkspaceId)
    ]);
    const sharedAiOutputApprovalIds = new Set(approvals.filter((approval) => String(approval.entity_type ?? approval.entityType) === "ai_employee_output").map((approval) => String(approval.entity_id ?? approval.entityId)));
    const aiOutputApprovals = aiOutputs
      .filter((output) => !sharedAiOutputApprovalIds.has(output.id))
      .filter((output) => ["draft", "pending_review", "needs_review", "provider_not_configured", "setup_needed", "manual_input_required", "blocked_by_guardrail"].includes(String(output.status ?? "")))
      .map((output) => {
        const payload = (output.output_json ?? output.outputJson ?? {}) as Record<string, unknown>;
        const metadata = (output.metadata ?? {}) as Record<string, unknown>;
        const blocked = ["provider_not_configured", "setup_needed", "manual_input_required", "blocked_by_guardrail"].includes(String(output.status ?? ""));
        return {
          id: `approval_${output.id}`,
          workspace_id: studioWorkspaceId,
          entity_type: "ai_employee_output",
          entity_id: output.id,
          approval_type: String(output.output_type ?? output.outputType ?? "ai_employee_output"),
          status: blocked ? "blocked" : "pending",
          notes: blocked ? `Blocked until resolved: ${((metadata.blockers as string[] | undefined) ?? [String(output.status ?? "blocked")]).join(", ")}` : String(payload.title ?? "AI employee output awaiting owner review"),
          source_label: "AI employee compatibility bridge"
        } as WorkspaceRow;
      });
    const unifiedApprovals = [...approvals, ...aiOutputApprovals];
    const proofPacks = exportPackages.filter((pack) => String(pack.package_type ?? pack.packageType ?? "") === "proof_pack");
    const growthPlans = exportPackages.filter((pack) => String(pack.package_type ?? pack.packageType ?? "") === "growth_plan");
    const socialDrafts = channels.filter((channel) => ["instagram", "facebook", "tiktok", "youtube_shorts", "threads", "linkedin", "google_business_profile", "bluesky"].includes(String(channel.channel_type ?? channel.channelType ?? "")));
    const criteria = [
      { key: "campaign", label: "Campaign exists", passed: campaigns.length > 0, blocker: "Create a campaign draft." },
      { key: "proof_pack", label: "Proof pack exists", passed: proofPacks.length > 0, blocker: "Generate a Campaign Proof Pack." },
      { key: "utm", label: "UTM links exist", passed: utmLinks.length > 0, blocker: "Create a tracking-ready UTM link." },
      { key: "assets", label: "Asset specs exist", passed: assets.length > 0, blocker: "Create campaign asset specs." },
      { key: "approval", label: "Approval items exist", passed: unifiedApprovals.length > 0, blocker: "Create owner approval items before publishing/export." }
    ];
    return {
      ok: true as const,
      setupKind: "",
      setupMessage: "",
      campaigns: redacted(campaigns),
      channels: redacted(channels),
      proofPacks: redacted(proofPacks),
      growthPlans: redacted(growthPlans),
      exportPackages: redacted(exportPackages),
      readinessScores: redacted(readinessScores),
      approvals: redacted(unifiedApprovals),
      aiOutputApprovals: redacted(aiOutputApprovals),
      tasks: redacted(tasks),
      recommendations: redacted(recommendations),
      assets: redacted(assets),
      utmLinks: redacted(utmLinks),
      sourceRecords: redacted(sourceRecords),
      templates: redacted(templates),
      verticalPacks: redacted(verticalPacks),
      providerConnections: redacted(providerConnections),
      providerStatuses: {
        google_ads: providerStatus(providerConnections, "google_ads"),
        meta: providerStatus(providerConnections, "meta"),
        pinterest: providerStatus(providerConnections, "pinterest"),
        email: providerStatus(providerConnections, "email"),
        analytics: providerStatus(providerConnections, "analytics")
      },
      summary: {
        campaigns: campaigns.length,
        draftCampaigns: statusCount(campaigns, "draft"),
        activeCampaigns: statusCount(campaigns, "approved") + statusCount(campaigns, "exported") + statusCount(campaigns, "manually_published"),
        proofPacks: proofPacks.length,
        growthPlans: growthPlans.length,
        adReadinessScores: readinessScores.filter((score) => String(score.score_type ?? score.scoreType) === "ad").length,
        pinterestDrafts: marketingRowsByChannel(channels, "pinterest").length,
        socialDrafts: socialDrafts.length,
        emailDrafts: marketingRowsByChannel(channels, "email").length,
        googleAdDrafts: marketingRowsByChannel(channels, "google_ads").length,
        metaAdDrafts: marketingRowsByChannel(channels, "meta_ads").length,
        assetSpecs: assets.length,
        utmLinks: utmLinks.length,
        researchItems: sourceRecords.filter((record) => ["reddit_observation", "community_observation", "competitor", "review", "social_comment", "owner_note", "imported_note"].includes(String(record.source_name ?? ""))).length,
        approvalItems: unifiedApprovals.filter((approval) => String(approval.status ?? "pending") === "pending").length,
        exportReadyItems: channels.filter((channel) => String(channel.status ?? "") === "export_ready").length + exportPackages.filter((pack) => String(pack.status ?? "") === "approved").length,
        unifiedReadiness: buildReadinessScore({ workspaceId: studioWorkspaceId, entityType: "marketing", entityId: studioWorkspaceId, scoreType: "campaign", criteria })
      }
    };
  } catch (error) {
    const setupKind = classifyStudioDataError(error);
    return emptyMarketingCommandCenterState(setupKind, setupMessages[setupKind] ?? setupMessages.data_unavailable);
  }
}

export function defaultGeneratedUtm(campaignName: string, source = "manual", medium = "campaign") {
  return buildUtmUrl({ baseUrl: "https://saltycowhide.com/", source, medium, campaignName });
}

export type MarketingCommandCenterData = Awaited<ReturnType<typeof getMarketingCommandCenterData>>;
