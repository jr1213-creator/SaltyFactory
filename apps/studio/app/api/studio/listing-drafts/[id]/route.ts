import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { exportListingDraft, validateListingDraft } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

async function readBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    const body: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      const text = String(value);
      if (["price"].includes(key)) body[key] = text === "" ? undefined : Number(text);
      else if (["ownerApproved"].includes(key)) body[key] = text === "on" || text === "true";
      else if (["tags", "seoKeywords", "approvedAssetIds", "approvedMockupIds"].includes(key)) body[key] = text.split(",").map((item) => item.trim()).filter(Boolean);
      else body[key] = text;
    }
    return body;
  }
  return {};
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const { id } = await params;
    const draft = await createRepositories().listingDraftV1.getById(id, workspaceId);
    if (!draft) return notFoundApiResponse();
    return NextResponse.json({ ok: true, status: "retrieved", listingDraft: draft });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const existing = await repos.listingDraftV1.getById(id, workspaceId);
    if (!existing) return notFoundApiResponse();
    const body = await readBody(req);
    const existingJson = (existing.listing_json ?? existing.listingJson ?? {}) as Record<string, unknown>;
    const nextJson = { ...existingJson, ...body };
    const validation = validateListingDraft(nextJson);
    const exportPayload = exportListingDraft(nextJson);
    const updated = await repos.listingDraftV1.update(id, {
      target_channel: String(nextJson.targetChannel || existing.target_channel || existing.targetChannel || ""),
      title: String(nextJson.title || ""),
      short_hook: nextJson.shortHook || null,
      description: String(nextJson.description || ""),
      price: nextJson.price ?? null,
      approval_status: nextJson.ownerApproved ? "approved" : "draft",
      validation_status: validation.status,
      validation_blockers: validation.blockers,
      listing_json: nextJson,
      export_payload: exportPayload,
      status: validation.status === "ready_for_export" ? "ready_for_review" : "draft",
      updated_by: user.id
    } as any);
    const wantsRedirect = req.headers.get("content-type")?.includes("form");
    if (wantsRedirect) return NextResponse.redirect(new URL(`/studio/listing-drafts/${encodeURIComponent(id)}`, req.url), { status: 303 });
    return NextResponse.json({ ok: true, status: "updated", listingDraft: updated, validation, exportPayload });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 400 });
    }
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  return POST(req, context);
}
