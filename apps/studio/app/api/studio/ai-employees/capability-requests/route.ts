import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";
import { createCapabilityRequest, parseRequestBody, workspaceId } from "../improvements/_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return NextResponse.json({ ok: true, requests: await createRepositories().aiWorkforce.capabilityRequests.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await parseRequestBody(req);
    return NextResponse.json({ ok: true, status: "pending", ...(await createCapabilityRequest(body, user.id)) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
