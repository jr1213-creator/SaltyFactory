import { NextResponse } from "next/server";
import { requireApprovalPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../../_auth";
import { createEmployeeFromApprovedRequest, workspaceId } from "../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprovalPermission(req, workspaceId);
    const { id } = await context.params;
    const result = await createEmployeeFromApprovedRequest(createRepositories(), id, user.id);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.status === "not_found" ? 404 : 409 });
    }
    return NextResponse.json({ ok: true, status: "employee_created", employee: result.employee, scopes: result.scopes });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
