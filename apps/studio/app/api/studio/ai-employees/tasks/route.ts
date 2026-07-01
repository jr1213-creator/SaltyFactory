import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return NextResponse.json({ ok: true, tasks: await createRepositories().aiEmployee.tasks.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const task = await createRepositories().aiEmployee.tasks.create({
      id: String(body.id || `aitask_${Date.now()}`),
      workspace_id: workspaceId,
      employee_type: String(body.employee_type || "listing_manager"),
      task_type: String(body.task_type || "recommendation"),
      status: "queued",
      input_ref_type: String(body.input_ref_type || "workspace"),
      input_ref_id: String(body.input_ref_id || workspaceId),
      priority: Number(body.priority || 5),
      requires_human_review: true,
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "queued", task });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
