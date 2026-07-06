import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { assertSafeTrendSourceRequest, runTrendSourcesForProfile } from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function failureStatus(error: unknown) {
  const code = typeof error === "object" && error && "failureCode" in error ? String((error as { failureCode?: unknown }).failureCode) : "";
  if (code === "trend_profile_missing") return 404;
  if (code === "trend_source_unsafe_automation_requested" || code === "source_restricted_do_not_automate") return 409;
  return 500;
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    assertSafeTrendSourceRequest(body);
    const profileId = typeof body.profileId === "string" ? body.profileId : "";
    const sourceKeys = Array.isArray(body.sourceKeys) ? body.sourceKeys.map(String) : undefined;
    const keywords = Array.isArray(body.keywords) ? body.keywords.map(String) : undefined;
    const dryRun = body.dryRun === true;

    const result = await runTrendSourcesForProfile({
      repos: createRepositories(),
      workspaceId,
      actorId: user.id,
      config: parseEnv(),
      profileId,
      sourceKeys,
      keywords,
      dryRun
    });

    return NextResponse.json(result);
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({
        ok: false,
        status: typeof error === "object" && error && "runStatus" in error ? (error as { runStatus?: unknown }).runStatus : "failed",
        failureCode: typeof error === "object" && error && "failureCode" in error ? (error as { failureCode?: unknown }).failureCode : null,
        message: sanitizeProviderError(error)
      }, { status: failureStatus(error) });
    }
  }
}
