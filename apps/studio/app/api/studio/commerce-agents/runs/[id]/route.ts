import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { listAgentTranscript } from "@saltyfactory/ai-free";
import { shopManagerWorkspaceId } from "../../../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../../../_auth";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, shopManagerWorkspaceId);
    const { id } = await params;
    const transcript = await listAgentTranscript({ repos: createRepositories(), workspaceId: shopManagerWorkspaceId, agentRunId: id });
    if (!transcript) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, agentRun: transcript.run, events: transcript.events });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
