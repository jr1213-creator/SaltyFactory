import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { nowId, withBusinessWrite, workspaceId } from "../../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessWrite(req, async (repos, user, body) => {
      const document = await repos.business.documents.getById(id, workspaceId);
      if (!document) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      if (!["approved", "owner_review"].includes(String(document.status))) {
        return NextResponse.json({ ok: false, status: "blocked_by_guardrail", blockingReasons: ["document_review_required"] }, { status: 409 });
      }
      const exportType = String(body.exportType || body.export_type || "pdf");
      const exportRow = await repos.business.documentExports.create({
        id: nowId("bizexport"),
        workspace_id: workspaceId,
        document_id: id,
        export_type: exportType,
        file_ref: `business-documents/${id}.${exportType}`,
        status: "generated",
        created_by: user.id,
        updated_by: user.id
      } as any);
      await repos.business.documents.update(id, { status: "exported", generated_file_refs: [...(Array.isArray(document.generated_file_refs) ? document.generated_file_refs : []), { exportId: exportRow.id, type: exportType }] } as any);
      return NextResponse.json({ ok: true, status: "exported", export: exportRow });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
