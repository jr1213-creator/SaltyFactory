import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { buildUtmUrl, sanitizeKernelPayload } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";
import { sharedWorkspaceId } from "../../shared/_shared";

export const runtime = "nodejs";

async function readBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
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
    const campaignName = String(body.campaign_name || body.campaignName || "salty_cowhide_campaign");
    const generatedUrl = buildUtmUrl({
      baseUrl: String(body.base_url || body.baseUrl || "https://saltycowhide.com/"),
      source: String(body.source || "saltyfactory"),
      medium: String(body.medium || "manual_export"),
      campaignName,
      term: String(body.term || ""),
      content: String(body.content || "")
    });
    const id = String(body.id || `utm_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    const repos = createRepositories();
    const record = await repos.shared.utmLinks.create({
      id,
      workspace_id: sharedWorkspaceId,
      campaign_id: String(body.campaign_id || body.campaignId || ""),
      channel_id: String(body.channel_id || body.channelId || ""),
      base_url: String(body.base_url || body.baseUrl || "https://saltycowhide.com/"),
      source: String(body.source || "saltyfactory"),
      medium: String(body.medium || "manual_export"),
      campaign_name: campaignName,
      term: String(body.term || ""),
      content: String(body.content || ""),
      generated_url: generatedUrl,
      status: "ready",
      updated_by: user.id
    });
    const redirectUrl = safeRedirectUrl(req, body.next, record.id);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, status: "created", record });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
