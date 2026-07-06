import { NextResponse } from "next/server";
import { parseEnv } from "@saltyfactory/config";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { enqueueLocalOllamaAgentRun, runLocalOllamaAgentTask } from "@saltyfactory/ai-free";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

function failureStatusCode(errorCode: string | undefined, status: "completed" | "blocked" | "failed" | "incomplete") {
  if (errorCode === "agent_daily_limit_exceeded") return 429;
  if (errorCode === "unknown_agent_role" || errorCode === "unsupported_agent_task_type") return 400;
  if (errorCode === "agent_queue_unavailable" || errorCode === "ollama_unavailable" || status === "blocked") return 503;
  return 500;
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = typeof body.productDraftId === "string" ? body.productDraftId : typeof body.product_draft_id === "string" ? body.product_draft_id : "";
    const instructions = typeof body.instructions === "string" ? body.instructions : undefined;
    const maxTurns = Number.isFinite(Number(body.maxTurns)) ? Number(body.maxTurns) : undefined;
    const repos = createRepositories();
    const config = parseEnv();

    if (config.AI_EMPLOYEES_AGENT_EXECUTION_MODE === "inline_test") {
      const result = await runLocalOllamaAgentTask({
        repos,
        workspaceId,
        actorId: user.id,
        roleKey: "product_listing_assistant",
        taskType: "draft_product_listing",
        taskInput: {
          productDraftId: productDraftId || undefined,
          instructions
        },
        ...(maxTurns ? { maxTurns } : {})
      });
      if (!result.ok) {
        return NextResponse.json({
          ok: false,
          status: result.status,
          agentRunId: result.agentRunId,
          blockingReason: result.blockingReason,
          errorCode: result.errorCode,
          message: result.blockingReason === "ollama_unavailable"
            ? "Local Ollama is not available. Start Ollama and configure a local model."
            : "The local AI employee run did not complete.",
          requiresHumanReview: true
        }, { status: failureStatusCode(result.errorCode, result.status) });
      }
      return NextResponse.json({
        ok: true,
        status: result.status,
        agentRunId: result.agentRunId,
        providerUsed: result.providerUsed,
        modelUsed: result.modelUsed,
        turnCount: result.turnCount,
        toolCallsExecuted: result.toolCallsExecuted,
        finalOutputId: result.finalOutputId,
        requiresHumanReview: true
      });
    }

    const queued = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId,
      actorId: user.id,
      roleKey: "product_listing_assistant",
      taskType: "draft_product_listing",
      taskInput: {
        productDraftId: productDraftId || undefined,
        instructions
      },
      ...(maxTurns ? { maxTurns } : {})
    });

    if (!queued.ok) {
      return NextResponse.json({
        ok: false,
        status: queued.status,
        ...(queued.agentRunId ? { agentRunId: queued.agentRunId } : {}),
        blockingReason: queued.blockingReason ?? null,
        errorCode: queued.errorCode ?? null,
        message: queued.errorCode === "agent_daily_limit_exceeded"
          ? "Daily AI employee run limit reached for this workspace."
          : queued.errorCode === "agent_queue_unavailable"
            ? "Agent queue is unavailable. Start the worker and try again."
            : queued.message,
        requiresHumanReview: true
      }, { status: failureStatusCode(queued.errorCode, queued.status) });
    }

    return NextResponse.json({
      ok: true,
      status: "queued",
      agentRunId: queued.agentRunId,
      nextAction: "poll_transcript",
      transcriptUrl: `/api/studio/ai-employees/agent-runs/${queued.agentRunId}/transcript`,
      requiresHumanReview: true
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
