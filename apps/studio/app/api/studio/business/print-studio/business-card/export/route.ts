import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../_auth";
import { nowId, withBusinessWrite, workspaceId } from "../../../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const documentId = String(body.documentId || body.document_id || "");
      const document = documentId ? await repos.business.documents.getById(documentId, workspaceId) : null;
      if (!document) return NextResponse.json({ ok: false, status: "not_found", blockingReasons: ["business_card_document_required"] }, { status: 404 });
      const exportType = String(body.exportType || body.export_type || "svg");
      const exportRow = await repos.business.documentExports.create({
        id: nowId("bizexport"),
        workspace_id: workspaceId,
        document_id: documentId,
        export_type: exportType,
        file_ref: exportType === "svg" ? `inline_svg:${documentId}` : `business-card/${documentId}.${exportType}`,
        status: "generated",
        created_by: user.id,
        updated_by: user.id
      } as any);
      return NextResponse.json({ ok: true, status: "business_card_exported", export: exportRow });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
