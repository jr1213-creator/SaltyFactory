import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { studioAuthErrorResponse } from "../../../_auth";
import { createHireRequest, parseRequestBody, workspaceId } from "../_shared";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await parseRequestBody(req);
    const result = await createHireRequest(body, user.id);
    return NextResponse.json({ ok: true, status: "needs_review", ...result });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
