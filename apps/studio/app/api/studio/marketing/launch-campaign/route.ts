import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { buildCampaignProofPackContent, buildNoAdGrowthPlanContent, buildReadinessScore, buildUtmUrl, sanitizeKernelPayload } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";
import { sharedWorkspaceId } from "../../shared/_shared";

export const runtime = "nodejs";

async function readBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

async function upsert(repo: { getById(id: string, workspaceId?: string): Promise<any>; create(row: any): Promise<any>; update(id: string, patch: any): Promise<any> }, row: any) {
  const existing = await repo.getById(row.id, sharedWorkspaceId);
  if (existing) return repo.update(row.id, row);
  return repo.create(row);
}

function slug(value: unknown) {
  return String(value || "campaign").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80) || "campaign";
}

function safeRedirectUrl(req: Request, next: unknown, id: string) {
  const value = String(next ?? "").trim();
  if (!value || !value.startsWith("/studio/") || value.includes("//")) return null;
  return new URL(value.replace("{id}", encodeURIComponent(id)), req.url);
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, sharedWorkspaceId);
    const body = sanitizeKernelPayload(await readBody(req)) as Record<string, unknown>;
    const repos = createRepositories();
    const now = new Date().toISOString();
    const campaignName = String(body.name || body.campaign_name || "Salty Cowhide Product Drop Launch");
    const campaignId = String(body.campaign_id || `campaign_${slug(campaignName)}`);
    const landingUrl = String(body.landing_url || "https://saltycowhide.com/");
    const thesis = String(body.goal || body.thesis || "Launch a proof-backed Salty Cowhide product/drop campaign.");
    const audience = String(body.audience || "Salty Cowhide buyers and high-intent leads");
    const offer = String(body.offer || "New product/drop offer");
    const productRef = String(body.product_ref || "");
    const campaign = await upsert(repos.shared.campaigns, {
      id: campaignId,
      workspace_id: sharedWorkspaceId,
      vertical_pack_id: String(body.vertical_pack_id || "vp_pod_boutique"),
      name: campaignName,
      campaign_type: String(body.campaign_type || "product_drop_launch"),
      goal: thesis,
      product_ref: productRef,
      offer_ref: String(body.offer_ref || ""),
      manual_offer: { offer, source: "manual_entry" },
      target_segment_id: String(body.target_segment_id || ""),
      audience,
      offer,
      landing_url: landingUrl,
      status: "ready_for_review",
      updated_by: user.id
    });
    const source = await upsert(repos.shared.sourceRecords, {
      id: `source_${campaignId}_workflow`,
      workspace_id: sharedWorkspaceId,
      origin: "system_generated",
      source_name: "campaign_launch_workflow",
      source_label: "System-generated",
      provider: "saltyfactory",
      raw_payload: { campaignId, productRef, featureClassification: "manual_export_ready_feature" },
      confidence: "0.82",
      created_at: now
    });
    const utmUrl = buildUtmUrl({ baseUrl: landingUrl, source: "saltyfactory", medium: "manual_export", campaignName });
    const utm = await upsert(repos.shared.utmLinks, {
      id: `utm_${campaignId}_primary`,
      workspace_id: sharedWorkspaceId,
      entity_type: "campaign",
      entity_id: campaignId,
      campaign_id: campaignId,
      base_url: landingUrl,
      source: "saltyfactory",
      medium: "manual_export",
      campaign_name: campaignName,
      generated_url: utmUrl,
      status: "ready",
      source_record_id: source.id,
      updated_by: user.id
    });
    const channelTypes = ["pinterest", "instagram", "facebook", "email", "google_ads", "meta_ads", "seo_geo"];
    const channels = await Promise.all(channelTypes.map((channelType) => upsert(repos.shared.campaignChannels, {
      id: `channel_${campaignId}_${channelType}`,
      workspace_id: sharedWorkspaceId,
      campaign_id: campaignId,
      channel_type: channelType,
      draft_content: {
        source: "rule_based",
        manualExport: true,
        noLivePublish: true,
        thesis,
        audience,
        offer,
        productRef,
        landingUrl,
        headline: `${campaignName} ${channelType.replace(/_/g, " ")}`,
        body: `${thesis}\n\nProduct/listing/drop reference: ${productRef || "manual offer"}\nAudience: ${audience}\nOffer: ${offer}\nLanding URL: ${landingUrl}\n\nDraft only. Owner review and manual/export workflow required.`
      },
      status: "ready_for_review",
      source_record_id: source.id,
      updated_by: user.id
    })));
    const assetSpecs: Array<[string, string]> = [
      ["pinterest_1000x1500", "Pinterest 1000x1500 pin asset"],
      ["instagram_1080x1080", "Instagram 1080x1080 feed asset"],
      ["email_hero", "Email hero image brief"],
      ["meta_feed_story", "Meta feed/story creative brief"],
      ["google_display", "Google Display creative sizes"]
    ];
    const assets = await Promise.all(assetSpecs.map(([key, title]) => upsert(repos.shared.assets, {
      id: `asset_${campaignId}_${key}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "campaign",
      entity_id: campaignId,
      asset_type: key.includes("email") ? "email_asset" : key.includes("pinterest") ? "pin_asset" : "ad_asset",
      title,
      description: "Asset specification only. No generated media is claimed.",
      spec: { key, generatedMedia: false, ownerApprovalRequired: true },
      status: "needed",
      source_record_id: source.id,
      updated_by: user.id
    })));
    const readiness = buildReadinessScore({
      id: `score_ad_${campaignId}`,
      workspaceId: sharedWorkspaceId,
      entityType: "campaign",
      entityId: campaignId,
      scoreType: "ad",
      criteria: [
        { key: "landing", label: "Landing page exists", passed: Boolean(landingUrl), blocker: "Add landing URL." },
        { key: "offer", label: "Offer clear", passed: Boolean(body.offer), blocker: "Clarify the campaign offer." },
        { key: "utm", label: "UTM link exists", passed: true },
        { key: "tracking", label: "Tracking readiness", passed: false, blocker: "Connect/verify analytics before paid ads." },
        { key: "creative", label: "Creative asset readiness", passed: false, blocker: "Create and approve creative assets." },
        { key: "approval", label: "Owner approval required", passed: false, blocker: "Owner approval must happen before publish/spend." }
      ]
    });
    await upsert(repos.shared.readinessScores, readiness);
    const proofContent = buildCampaignProofPackContent({ campaign, channels, readiness: [readiness], sourceLabel: "System-generated" });
    const proofPack = await upsert(repos.shared.exportPackages, {
      id: `export_proof_${campaignId}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "campaign",
      entity_id: campaignId,
      package_type: "proof_pack",
      title: `${campaignName} Campaign Proof Pack`,
      content: proofContent,
      version: 1,
      status: "ready_for_review",
      source_record_id: source.id,
      updated_by: user.id
    });
    const growthPlan = await upsert(repos.shared.exportPackages, {
      id: `export_growth_${campaignId}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "campaign",
      entity_id: campaignId,
      package_type: "growth_plan",
      title: `${campaignName} No-Ad Growth Plan`,
      content: buildNoAdGrowthPlanContent(campaign),
      version: 1,
      status: "ready_for_review",
      source_record_id: source.id,
      updated_by: user.id
    });
    const approvals = await Promise.all(["campaign_brief", "proof_pack", "channel_drafts", "asset_specs", "utm_link"].map((approvalType) => upsert(repos.shared.approvals, {
      id: `approval_${campaignId}_${approvalType}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "campaign",
      entity_id: campaignId,
      approval_type: approvalType,
      status: "pending",
      requested_by: user.id,
      requested_at: now,
      source_record_id: source.id,
      updated_by: user.id
    })));
    const tasks = await Promise.all((readiness.blockers as string[]).map((blocker, index) => upsert(repos.shared.tasks, {
      id: `task_${campaignId}_blocker_${index}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "campaign",
      entity_id: campaignId,
      title: blocker,
      description: "Created by launch campaign workflow from ad readiness blocker.",
      status: "pending",
      priority: index < 2 ? "high" : "normal",
      source_record_id: source.id,
      updated_by: user.id
    })));
    const recommendations = await Promise.all(["Prioritize no-ad growth before paid spend.", "Approve proof pack before manual publishing.", "Review creative asset specs before export."].map((title, index) => upsert(repos.shared.recommendations, {
      id: `rec_${campaignId}_${index}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "campaign",
      entity_id: campaignId,
      recommendation_type: "marketing_next_action",
      title,
      body: "Rule-based recommendation created by the guided launch workflow.",
      kind: "rule_based",
      confidence: "0.78",
      status: "pending",
      source_record_id: source.id,
      updated_by: user.id
    })));
    await repos.shared.events.create({
      id: `event_campaign_workflow_${campaignId}_${Date.now()}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "campaign",
      entity_id: campaignId,
      event_type: "campaign_workflow_generated",
      event_label: "Guided campaign workflow generated manual/export-ready packet",
      payload: { proofPackId: proofPack.id, growthPlanId: growthPlan.id, utmId: utm.id, channels: channelTypes },
      source_record_id: source.id,
      source_label: "System-generated",
      created_by: user.id
    });
    const redirectUrl = safeRedirectUrl(req, body.next, campaignId);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({
      ok: true,
      status: "ready_for_review",
      campaignId,
      productRef,
      records: {
        campaign: campaign.id,
        sourceRecord: source.id,
        channels: channels.length,
        assets: assets.length,
        utm: utm.id,
        proofPack: proofPack.id,
        growthPlan: growthPlan.id,
        approvals: approvals.length,
        tasks: tasks.length,
        recommendations: recommendations.length
      }
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
