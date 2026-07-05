import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { runAssetQaEvaluation } from "../../../_asset-qa";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const repos = createRepositories();
    const asset = await repos.asset.getById(id, workspaceId);
    if (!asset) return notFoundApiResponse();

    const result = await runAssetQaEvaluation({
      repos,
      workspaceId,
      assetId: id,
      actorId: user.id,
      productDraftId: String(body.productDraftId ?? body.product_draft_id ?? ""),
      productType: String(body.productType ?? body.product_type ?? ""),
      printTarget: String(body.printTarget ?? body.print_target ?? ""),
      blueprintId: String(body.blueprintId ?? body.blueprint_id ?? ""),
      printProviderId: String(body.printProviderId ?? body.print_provider_id ?? ""),
      variantIds: Array.isArray(body.variantIds) ? body.variantIds.map(String) : [],
      printArea: body.printArea && typeof body.printArea === "object" ? body.printArea as { width?: unknown; height?: unknown } : null
    });

    return NextResponse.json({ ok: true, status: result.status, qa: result.qa });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
