import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function readBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await req.json().catch(() => ({}));
  if (contentType.includes("form")) return Object.fromEntries((await req.formData()).entries());
  return {};
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    return NextResponse.json({
      ok: true,
      evaluations: await repos.aiModelRuntime.evaluations.listByWorkspace(workspaceId)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await readBody(req);
    const repos = createRepositories();
    const modelId = String(body.modelId || body.model_id || "");
    const model = modelId ? await repos.aiModelRuntime.models.getById(modelId) : null;
    if (!model) return NextResponse.json({ ok: false, status: "not_found", blockingReasons: ["model_not_found"] }, { status: 404 });
    const evaluation = await repos.aiModelRuntime.evaluations.create({
      id: id("model_eval"),
      workspace_id: workspaceId,
      model_id: modelId,
      eval_name: String(body.evalName || body.eval_name || "Owner review eval"),
      task_type: String(body.taskType || body.task_type || "draft_task"),
      test_input_ref: String(body.testInputRef || body.test_input_ref || "internal_fixture"),
      expected_behavior: String(body.expectedBehavior || body.expected_behavior || "Follow guardrails and produce owner-reviewable drafts."),
      result_summary: String(body.resultSummary || body.result_summary || "Manual eval recorded."),
      passed: body.passed === true || body.passed === "true",
      score: Number(body.score || 0) || null,
      failure_notes: body.failureNotes || body.failure_notes || null,
      created_by: user.id
    } as WorkspaceRow);
    return NextResponse.json({ ok: true, status: "evaluation_recorded", evaluation });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
