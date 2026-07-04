import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { metadataOf } from "../../../_image-production";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const selected = await repos.mockup.getById(id, workspaceId);
    if (!selected) return notFoundApiResponse();
    const sourceAssetId = String(selected.asset_id ?? selected.assetId ?? "");
    const siblings = (await repos.mockup.listByWorkspace(workspaceId))
      .filter((mockup) => String(mockup.asset_id ?? mockup.assetId ?? "") === sourceAssetId);
    for (const mockup of siblings) {
      const metadata = metadataOf(mockup);
      await repos.mockup.update(mockup.id, {
        metadata: { ...metadata, is_hero: mockup.id === id },
        updated_by: user.id
      });
    }
    const updated = await repos.mockup.getById(id, workspaceId);
    return NextResponse.json({ ok: true, status: "hero_mockup_selected", mockup: updated });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
