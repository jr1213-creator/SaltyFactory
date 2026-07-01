import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { runDeterministicAiEmployee } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    return NextResponse.json({
      ok: true,
      employees: await repos.aiEmployee.listByWorkspace(workspaceId),
      tasks: await repos.aiEmployee.tasks.listByWorkspace(workspaceId),
      runs: await repos.aiEmployee.runs.listByWorkspace(workspaceId)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const requestedEmployeeRole = typeof body["employee_role"] === "string"
      ? body["employee_role"]
      : typeof body["employee_type"] === "string"
        ? body["employee_type"]
        : "trend_scout";
    const role = requestedEmployeeRole as any;
    const result = await runDeterministicAiEmployee({ repos: createRepositories(), workspaceId, actorId: user.id, role, inputRefType: body.input_ref_type, inputRefId: body.input_ref_id });
    return NextResponse.json({ ok: true, status: "draft_output_created", ...result });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
