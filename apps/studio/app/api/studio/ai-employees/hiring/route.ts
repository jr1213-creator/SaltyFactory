import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";
import { createHireRequest, parseRequestBody, workspaceId } from "./_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    const requests = await repos.aiWorkforce.hireRequests.listByWorkspace(workspaceId);
    const specs = await repos.aiWorkforce.roleSpecs.list();
    const employees = await repos.aiWorkforce.employeeDefinitions.listByWorkspace(workspaceId);
    return NextResponse.json({ ok: true, requests, specs, employees });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

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
