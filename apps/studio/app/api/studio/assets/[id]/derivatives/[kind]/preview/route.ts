import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../../../_auth";
import { privatePreviewResponse } from "../../../../../_private-preview";
import { findAssetDerivative, generatedDerivativeKinds, type GeneratedDerivativeKind } from "../../../../../_image-production";

export const runtime = "nodejs";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  try {
    await requireWorkspaceMember(_req, workspaceId);
    const { id, kind } = await params;
    if (!generatedDerivativeKinds.includes(kind as GeneratedDerivativeKind)) return notFoundApiResponse();
    const repos = createRepositories();
    const source = await repos.asset.getById(id, workspaceId);
    if (!source) return notFoundApiResponse();
    const derivative = await findAssetDerivative(repos, workspaceId, id, kind as GeneratedDerivativeKind);
    if (!derivative) return notFoundApiResponse();
    return privatePreviewResponse({ row: derivative, workspaceId, fallbackKind: "assets" });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
