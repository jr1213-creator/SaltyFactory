import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { studioWorkspaceId } from "../../../design-suggestions/_shared";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, studioWorkspaceId);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const repos = createRepositories();
    const brief = await repos.brief.getById(id, studioWorkspaceId);
    if (!brief) return notFoundApiResponse();
    const currentStyle = brief.style_direction ?? brief.styleDirection;
    const style = currentStyle && typeof currentStyle === "object" ? currentStyle as Record<string, unknown> : {};
    const updated = await repos.brief.update(id, {
      collection: String(body.collection ?? brief.collection),
      product_targets: Array.isArray(body.product_targets) ? body.product_targets : brief.product_targets ?? brief.productTargets ?? [],
      style_direction: { ...style, ...(body.style_direction && typeof body.style_direction === "object" ? body.style_direction : {}) },
      generation_prompt: String(body.generation_prompt ?? brief.generation_prompt ?? brief.generationPrompt),
      negative_prompt: String(body.negative_prompt ?? brief.negative_prompt ?? brief.negativePrompt),
      status: "draft",
      approved_for_generation: false,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "brief_updated_requires_review", brief: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
