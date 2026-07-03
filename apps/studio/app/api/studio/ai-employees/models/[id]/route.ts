import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { ensureDefaultModelRuntimeRecords, sanitizeModel, sanitizeModelProvider } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const { id } = await context.params;
    const repos = createRepositories();
    await ensureDefaultModelRuntimeRecords(workspaceId, repos);
    const model = await repos.aiModelRuntime.models.getById(id);
    if (!model) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
    const provider = await repos.aiModelRuntime.providers.getById(String(model.provider_id ?? model.providerId), workspaceId);
    if (!provider) return NextResponse.json({ ok: false, status: "provider_not_found" }, { status: 404 });
    const evaluations = (await repos.aiModelRuntime.evaluations.listByWorkspace(workspaceId)).filter((evaluation) =>
      String(evaluation.model_id ?? evaluation.modelId) === id
    );
    const usage = (await repos.aiModelRuntime.usageEvents.listByWorkspace(workspaceId)).filter((event) =>
      String(event.model_id ?? event.modelId) === id
    );
    return NextResponse.json({
      ok: true,
      model: sanitizeModel(model),
      provider: sanitizeModelProvider(provider),
      evaluations,
      usageEvents: usage
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
