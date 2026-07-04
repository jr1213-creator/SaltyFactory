import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { checkStorageReadiness } from "@saltyfactory/storage";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const config = parseEnv();
    const diagnostic = await checkStorageReadiness(config);
    const repos = createRepositories();
    await repos.integration.updateProviderConnectionStatus(workspaceId, "supabase_storage", {
      id: `conn_supabase_storage_${Date.now()}`,
      workspace_id: workspaceId,
      provider_type: "supabase_storage",
      provider_name: "Supabase Storage",
      enabled: diagnostic.ok,
      status: diagnostic.status,
      last_health_check_at: new Date().toISOString(),
      last_health_check_status: diagnostic.status,
      configuration: { environment: diagnostic.environment, checks: diagnostic.checks, setupRequired: diagnostic.setupRequired },
      updated_by: user.id
    });
    return NextResponse.json({ ok: diagnostic.ok, status: diagnostic.status, setupRequired: diagnostic.setupRequired, environment: diagnostic.environment, checks: diagnostic.checks, message: diagnostic.safeMessage });
  } catch (error) {
    if (typeof error === "object" && error && "status" in error) return studioAuthErrorResponse(error);
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
  }
}
