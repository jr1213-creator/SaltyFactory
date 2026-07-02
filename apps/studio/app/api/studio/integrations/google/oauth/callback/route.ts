import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { exchangeGoogleOAuthCode, googleOAuthSetupRequired, storeVerifiedGoogleOAuth } from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { setupResponse, verifyOAuthState, workspaceId } from "../../../_shared";
import { studioAuthErrorResponse } from "../../../../_auth";

export async function GET(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const url = new URL(req.url);
    const stateValue = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    const error = url.searchParams.get("error") || "";
    const config = parseEnv();
    const setupRequired = googleOAuthSetupRequired(config);
    if (setupRequired.length) return setupResponse("google_oauth", "Google OAuth callback requires server-side client config and encrypted credential storage.", setupRequired);

    let state: Record<string, unknown>;
    try {
      state = verifyOAuthState(stateValue, config.CREDENTIAL_ENCRYPTION_KEY);
    } catch {
      return NextResponse.json({ ok: false, status: "blocked", message: "Invalid OAuth state." }, { status: 400 });
    }
    if (String(state.workspaceId) !== workspaceId) return NextResponse.json({ ok: false, status: "blocked", message: "OAuth state workspace mismatch." }, { status: 400 });
    if (String(state.actorId) !== user.id || String(state.supabaseUserId) !== user.supabaseUserId) return NextResponse.json({ ok: false, status: "blocked", message: "OAuth state user mismatch." }, { status: 400 });
    if (Number(state.expiresAt ?? 0) < Date.now()) return NextResponse.json({ ok: false, status: "blocked", message: "OAuth state expired." }, { status: 400 });
    if (error) return NextResponse.json({ ok: false, status: "error", message: "Google authorization failed.", errorCode: sanitizeProviderError(error) }, { status: 400 });
    if (!code) return NextResponse.json({ ok: false, status: "blocked", message: "Google callback did not include an authorization code." }, { status: 400 });

    const tokens = await exchangeGoogleOAuthCode({ code, config });
    const stored = await storeVerifiedGoogleOAuth({ repos: createRepositories(), workspaceId, actorId: user.id, config, tokens });
    return NextResponse.json({ ok: true, status: "connected", provider: "google_oauth", connection: stored.safeConnection });
  } catch (error) {
    const message = sanitizeProviderError(error);
    if (message.includes("Google did not return a refresh token")) {
      return NextResponse.json({ ok: false, status: "needs_reauth", provider: "google_oauth", message, setupRequired: ["Reconnect Google and approve offline access."] }, { status: 400 });
    }
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "configured_not_verified", provider: "google_oauth", message }, { status: 502 });
    }
  }
}
