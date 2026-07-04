import { NextResponse } from "next/server";
import {
  createPrintifyProviderFromResolution,
  publicPrintifyProviderResolution,
  resolvePrintifyProvider,
  type PrintifyProviderResolution
} from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";

export const printifyWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function resolvePrintifyRuntime(repos: RepositoryBundle = createRepositories()) {
  const config = parseEnv();
  const resolution = await resolvePrintifyProvider({ workspaceId: printifyWorkspaceId, repos, config });
  return {
    config,
    repos,
    resolution,
    printify: createPrintifyProviderFromResolution(resolution)
  };
}

export function printifySetupRequiredResponse(resolution: PrintifyProviderResolution, status = 503) {
  const publicResolution = publicPrintifyProviderResolution(resolution);
  return NextResponse.json({
    ok: false,
    status: "setup_required",
    provider: "printify",
    safeMessage: publicResolution.safeMessage,
    message: publicResolution.safeMessage,
    setupRequired: publicResolution.setupRequired,
    blockingReasons: publicResolution.blockingReasons.length ? publicResolution.blockingReasons : publicResolution.setupRequired,
    setupAction: publicResolution.setupAction,
    printify: publicResolution
  }, { status });
}
