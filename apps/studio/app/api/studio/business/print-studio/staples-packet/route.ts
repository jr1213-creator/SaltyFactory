import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../_auth";
import { createStaplesPacket, withBusinessWrite } from "../../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const documentId = String(body.documentId || body.document_id || "");
      const result = await createStaplesPacket(repos, documentId, user.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 404 });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
