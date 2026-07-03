import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../_auth";
import { withBusinessRead, withBusinessWrite, workspaceId } from "../../_shared";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessRead(req, async (repos) => {
      const document = await repos.business.documents.getById(id, workspaceId);
      if (!document) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      return NextResponse.json({ ok: true, document });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessWrite(req, async (repos, user, body) => {
      const document = await repos.business.documents.getById(id, workspaceId);
      if (!document) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const updated = await repos.business.documents.update(id, { title: body.title || document.title, status: body.status || document.status, updated_by: user.id } as any);
      return NextResponse.json({ ok: true, status: "updated", document: updated });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
