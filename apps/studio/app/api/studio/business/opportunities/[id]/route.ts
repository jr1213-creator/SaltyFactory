import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../_auth";
import { json, withBusinessRead, workspaceId } from "../../_shared";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessRead(req, async (repos) => {
      const opportunity = await repos.business.opportunities.getById(id, workspaceId);
      if (!opportunity) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      return json({ ok: true, opportunity });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
