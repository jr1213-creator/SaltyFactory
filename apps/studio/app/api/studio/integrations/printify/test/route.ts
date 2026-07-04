import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { publicPrintifyProviderResolution } from "@saltyfactory/commerce";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";
import { printifySetupRequiredResponse, printifyWorkspaceId, resolvePrintifyRuntime } from "../_runtime";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, printifyWorkspaceId);
    const repos = createRepositories();
    const runtime = await resolvePrintifyRuntime(repos);
    if (runtime.resolution.status !== "ready") return printifySetupRequiredResponse(runtime.resolution);
    const result = await runtime.printify.testConnection();
    const status = result.ok ? "connected" : "configured_not_verified";
    const existing = await repos.integration.getProviderConnectionForWorkspace(printifyWorkspaceId, "printify");
    await repos.integration.updateProviderConnectionStatus(printifyWorkspaceId, "printify", {
      id: existing?.id ? String(existing.id) : `conn_printify_${Date.now()}`,
      workspace_id: printifyWorkspaceId,
      provider_type: "printify",
      provider_name: "Printify",
      secret_ref: existing?.secret_ref ?? existing?.secretRef ?? null,
      enabled: result.ok,
      status,
      last_health_check_at: new Date().toISOString(),
      last_health_check_status: status,
      configuration: { ...((existing?.configuration ?? {}) as Record<string, unknown>), shopId: runtime.resolution.shopId || null, selectedShopId: runtime.resolution.shopId || null },
      updated_by: user.id
    });
    return NextResponse.json({ ok: result.ok, status, provider: "printify", data: result.ok ? result.data : null, message: result.ok ? "Printify API verified." : result.error, setupRequired: result.ok ? [] : result.setupRequired ?? ["Reconnect Printify"], printify: publicPrintifyProviderResolution(runtime.resolution) });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}
