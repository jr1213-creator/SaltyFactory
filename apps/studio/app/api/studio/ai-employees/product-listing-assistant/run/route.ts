import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { runLocalOllamaAgentTask } from "@saltyfactory/ai-free";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const productDraftId = typeof body.productDraftId === "string" ? body.productDraftId : typeof body.product_draft_id === "string" ? body.product_draft_id : "";
    const instructions = typeof body.instructions === "string" ? body.instructions : undefined;
    const maxTurns = Number.isFinite(Number(body.maxTurns)) ? Number(body.maxTurns) : undefined;
    const result = await runLocalOllamaAgentTask({
      repos: createRepositories(),
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
      }, { status: result.status === "blocked" ? 503 : 500 });
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
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
