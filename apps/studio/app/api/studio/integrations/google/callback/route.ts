import { NextResponse } from "next/server";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { getIntegrationStates, upsertProviderConnection } from "@saltyfactory/integrations";
import { setupResponse, verifyOAuthState, workspaceId } from "../../_shared";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const stateValue = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const error = url.searchParams.get("error") || "";
  const config = parseEnv();
  if (!config.CREDENTIAL_ENCRYPTION_KEY) return setupResponse("google_oauth", "Google OAuth callback requires credential encryption.", ["CREDENTIAL_ENCRYPTION_KEY"]);
  let state: Record<string, unknown>;
  try {
    state = verifyOAuthState(stateValue, config.CREDENTIAL_ENCRYPTION_KEY);
  } catch {
    return NextResponse.json({ ok: false, status: "blocked", message: "Invalid OAuth state." }, { status: 400 });
  }
  if (String(state.workspaceId) !== workspaceId) return NextResponse.json({ ok: false, status: "blocked", message: "OAuth state workspace mismatch." }, { status: 400 });
  if (error) return NextResponse.json({ ok: false, status: "error", message: "Google authorization failed.", errorCode: error }, { status: 400 });
  if (!code) return NextResponse.json({ ok: false, status: "blocked", message: "Google callback did not include an authorization code." }, { status: 400 });
  const googleState = getIntegrationStates(config).find((item) => item.key === "google_oauth");
  if (!googleState) return setupResponse("google_oauth", "Google OAuth state unavailable.");
  await upsertProviderConnection({ repos: createRepositories(), workspaceId, actorId: String(state.actorId || "system"), state: { ...googleState, status: "needs_reauth" } });
  return NextResponse.json({
    ok: false,
    status: "needs_reauth",
    provider: "google_oauth",
    message: "OAuth code was validated with signed state, but token exchange/storage is not enabled until Google client secret exchange is wired server-side.",
    setupRequired: ["Implement server-side token exchange for Google OAuth before marking connected."]
  }, { status: 501 });
}
