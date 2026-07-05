import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { listAgentTranscript } from "@saltyfactory/ai-free";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

const value = (row: Record<string, unknown>, snake: string, camel = snake.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())) =>
  row[snake] ?? row[camel];

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const params = await context.params;
    const transcript = await listAgentTranscript({ repos: createRepositories(), workspaceId, agentRunId: params.id });
    if (!transcript) {
      return NextResponse.json({ ok: false, status: "not_found", message: "Agent run not found." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      agentRun: {
        id: transcript.run.id,
        status: value(transcript.run, "status"),
        roleKey: value(transcript.run, "employee_type"),
        taskType: value(transcript.run, "task_type"),
        providerUsed: value(transcript.run, "provider_used"),
        modelUsed: value(transcript.run, "model_used"),
        turnCount: Number((value(transcript.run, "metadata") as Record<string, unknown> | undefined)?.turnCount ?? 0),
        blockingReason: (value(transcript.run, "metadata") as Record<string, unknown> | undefined)?.blockingReason ?? null
      },
      events: transcript.events.map((event) => ({
        id: event.id,
        turnIndex: value(event, "turn_index"),
        eventType: value(event, "event_type"),
        role: value(event, "role"),
        toolName: value(event, "tool_name"),
        content: value(event, "content"),
        createdAt: value(event, "created_at")
      }))
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
