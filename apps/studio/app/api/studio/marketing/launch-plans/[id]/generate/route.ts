import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import {
  getMarketingLaunchPlanDetail,
  runLocalOllamaAgentTask,
  enqueueLocalOllamaAgentRun,
  toSafeMarketingLaunchError
} from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../../../_auth";
import { marketingWorkspaceId, readJsonOrFormBody, safeStudioRedirect } from "../../../_shared";

function marketingInstructions() {
  return "Generate a full owner-reviewable marketing launch package using only persisted workspace data and allowlisted tools. Required sequence: read the source data, draft all package outputs, calculate budget recommendations, compile the campaign build sheet, run policy review, then call save_marketing_output_for_review, and only after that return final JSON. If you skip the save tool the run will fail. Do not publish, post, send, schedule, spend, mutate Shopify, create live campaigns, call Printify, call Hugging Face, or generate images.";
}

function failureStatusCode(errorCode?: string, status: "completed" | "blocked" | "failed" | "incomplete" = "failed") {
  if (errorCode === "marketing_no_approved_source_entity") return 409;
  if (errorCode === "policy_review_required") return 409;
  if (errorCode === "unknown_agent_role" || errorCode === "unsupported_agent_task_type") return 400;
  if (errorCode === "agent_daily_limit_exceeded") return 429;
  if (errorCode === "agent_queue_unavailable" || errorCode === "ollama_unavailable" || status === "blocked") return 503;
  return 500;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, marketingWorkspaceId);
    const body = await readJsonOrFormBody(req) as Record<string, unknown>;
    const { id } = await params;
    const repos = createRepositories();
    const detail = await getMarketingLaunchPlanDetail({ repos, workspaceId: marketingWorkspaceId, launchPlanId: id });
    if (!detail) {
      return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    }

    const dryRun = body.dryRun === true || body.dryRun === "true";
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        status: "dry_run",
        launchPlanId: id,
        sourceEntityType: detail.launchPlan.sourceEntityType,
        sourceEntityId: detail.launchPlan.sourceEntityId
      });
    }

    const config = parseEnv();
    if (config.AI_EMPLOYEES_AGENT_EXECUTION_MODE === "inline_test") {
      const result = await runLocalOllamaAgentTask({
        repos,
        workspaceId: marketingWorkspaceId,
        actorId: user.id,
        roleKey: "marketing_launch_planner",
        taskType: "generate_marketing_launch_package",
        taskInput: {
          launchPlanId: id,
          sourceEntityType: String(detail.launchPlan.sourceEntityType || ""),
          sourceEntityId: String(detail.launchPlan.sourceEntityId || ""),
          brandVoiceProfileId: String(detail.launchPlan.brandVoiceProfileId || ""),
          instructions: marketingInstructions()
        }
      });
      const updated = await getMarketingLaunchPlanDetail({ repos, workspaceId: marketingWorkspaceId, launchPlanId: id });
      if (!result.ok) {
        return NextResponse.json({
          ok: false,
          status: result.status,
          launchPlanId: id,
          agentRunId: result.agentRunId,
          blockingReason: result.blockingReason,
          errorCode: result.errorCode,
          message: result.blockingReason === "ollama_unavailable"
            ? "Local Ollama is not available. Start Ollama and configure the local model."
            : "The Marketing Launch Planner did not complete.",
          requiresHumanReview: true
        }, { status: failureStatusCode(result.errorCode, result.status) });
      }
      const redirectUrl = safeStudioRedirect(req, body.next, id);
      if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
      return NextResponse.json({
        ok: true,
        status: result.status,
        launchPlanId: id,
        agentRunId: result.agentRunId,
        detail: updated,
        requiresHumanReview: true
      });
    }

    const queued = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId: marketingWorkspaceId,
      actorId: user.id,
      roleKey: "marketing_launch_planner",
      taskType: "generate_marketing_launch_package",
      taskInput: {
        launchPlanId: id,
        sourceEntityType: String(detail.launchPlan.sourceEntityType || ""),
        sourceEntityId: String(detail.launchPlan.sourceEntityId || ""),
        brandVoiceProfileId: String(detail.launchPlan.brandVoiceProfileId || ""),
        instructions: marketingInstructions()
      }
    });

    if (!queued.ok) {
      return NextResponse.json({
        ok: false,
        status: queued.status,
        ...(queued.agentRunId ? { agentRunId: queued.agentRunId } : {}),
        errorCode: queued.errorCode ?? null,
        blockingReason: queued.blockingReason ?? null,
        message: queued.errorCode === "agent_queue_unavailable"
          ? "Agent queue is unavailable. Start the worker and try again."
          : queued.message
      }, { status: failureStatusCode(queued.errorCode, queued.status) });
    }

    const redirectUrl = safeStudioRedirect(req, body.next, id);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({
      ok: true,
      status: "queued",
      launchPlanId: id,
      agentRunId: queued.agentRunId,
      nextAction: "poll_transcript",
      transcriptUrl: `/api/studio/ai-employees/agent-runs/${queued.agentRunId}/transcript`,
      launchPlanUrl: `/api/studio/marketing/launch-plans/${id}`,
      requiresHumanReview: true
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: toSafeMarketingLaunchError(error) }, { status: 500 });
    }
  }
}
