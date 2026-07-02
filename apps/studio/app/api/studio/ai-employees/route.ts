import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { agenticRunModes } from "@saltyfactory/domain";
import { runAgenticAiEmployeeWorkflow, runDeterministicAiEmployee } from "@saltyfactory/ai-free";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

const connectionStatus = (connections: Array<Record<string, unknown>>, providerKey: string) => {
  const row = connections.find((connection) => connection.provider_key === providerKey || connection.providerKey === providerKey || connection.provider_type === providerKey || connection.providerType === providerKey);
  return String(row?.status ?? "not_configured");
};

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    return NextResponse.json({
      ok: true,
      employees: await repos.aiEmployee.listByWorkspace(workspaceId),
      tasks: await repos.aiEmployee.tasks.listByWorkspace(workspaceId),
      runs: await repos.aiEmployee.runs.listByWorkspace(workspaceId),
      outputs: await repos.aiEmployee.outputs.listByWorkspace(workspaceId)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const requestedEmployeeRole = typeof body["employee_role"] === "string"
      ? body["employee_role"]
      : typeof body["employee_type"] === "string"
        ? body["employee_type"]
        : "trend_scout";
    if (body.agentic === true || typeof body.run_mode === "string") {
      const bodyRunMode = typeof body.run_mode === "string" ? body.run_mode : "";
      const runMode = (agenticRunModes as readonly string[]).includes(bodyRunMode) ? bodyRunMode as (typeof agenticRunModes)[number] : "daily_pod_planning";
      const repos = createRepositories();
      const config = parseEnv();
      const connections = await repos.integration.listProviderConnectionsForWorkspace(workspaceId);
      const result = await runAgenticAiEmployeeWorkflow({
        repos,
        workspaceId,
        actorId: user.id,
        runMode,
        aiProviderConfigured: config.providers.aiText.enabled,
        imageProviderConfigured: config.providers.aiImage.enabled,
        shopifyStatus: connectionStatus(connections, "shopify"),
        printifyStatus: connectionStatus(connections, "printify"),
        googleStatus: connectionStatus(connections, "google_oauth") === "connected" ? "connected" : connectionStatus(connections, "ga4"),
        merchantStatus: connectionStatus(connections, "google_merchant_center")
      });
      return NextResponse.json({
        ok: true,
        status: "draft_outputs_created",
        run: result.run,
        outputs: result.outputs,
        workflow: result.workflow
      });
    }
    const role = requestedEmployeeRole as any;
    const result = await runDeterministicAiEmployee({ repos: createRepositories(), workspaceId, actorId: user.id, role, inputRefType: body.input_ref_type, inputRefId: body.input_ref_id });
    return NextResponse.json({ ok: true, status: "draft_output_created", ...result });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
