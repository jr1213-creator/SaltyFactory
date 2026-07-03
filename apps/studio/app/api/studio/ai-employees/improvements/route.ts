import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";
import { createImprovementSuggestion, parseRequestBody, repeatedBlockerSuggestion, workspaceId } from "./_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    return NextResponse.json({
      ok: true,
      suggestions: await repos.aiWorkforce.improvementSuggestions.listByWorkspace(workspaceId),
      capabilityRequests: await repos.aiWorkforce.capabilityRequests.listByWorkspace(workspaceId),
      trainingRequests: await repos.aiWorkforce.trainingRequests.listByWorkspace(workspaceId),
      toolAccessRequests: await repos.aiWorkforce.toolAccessRequests.listByWorkspace(workspaceId),
      feedbackEvents: await repos.aiWorkforce.feedbackEvents.listByWorkspace(workspaceId)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await parseRequestBody(req);
    if (body.trigger === "repeated_blocker") {
      const triggered = await repeatedBlockerSuggestion({
        blocker: String(body.blocker || "unknown_blocker"),
        count: Number(body.count || 0),
        affectedWorkflow: String(body.affectedWorkflow || body.affected_workflow || "POD workflow"),
        actorId: user.id
      });
      if (!triggered) return NextResponse.json({ ok: false, status: "not_triggered", blockingReasons: ["repeated_blocker_count_below_3"] }, { status: 409 });
      return NextResponse.json({ ok: true, status: "submitted", ...triggered });
    }
    const result = await createImprovementSuggestion(body, user.id);
    return NextResponse.json({ ok: true, status: "submitted", ...result });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
