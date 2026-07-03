import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../../_auth";
import { createCapabilityRequest, workspaceId } from "../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await context.params;
    const repos = createRepositories();
    const suggestion = await repos.aiWorkforce.improvementSuggestions.getById(id, workspaceId);
    if (!suggestion) return NextResponse.json({ ok: false, status: "not_found", blockingReasons: ["suggestion_not_found"] }, { status: 404 });
    const created = await createCapabilityRequest({
      employeeId: suggestion.affected_employee_id || suggestion.affectedEmployeeId || "employee_unknown",
      capabilityName: suggestion.title,
      reasonNeeded: suggestion.summary,
      currentLimitation: suggestion.current_behavior,
      requestedPermissionLevel: "recommend",
      requestedActions: ["draft", "recommend"]
    }, user.id, repos);
    await repos.aiWorkforce.improvementSuggestions.update(id, { status: "converted", owner_decision: "converted_to_capability_request" } as any);
    return NextResponse.json({ ok: true, status: "converted_to_capability_request", ...created });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
