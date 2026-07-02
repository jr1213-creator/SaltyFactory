import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { buildGoogleAuthorizationUrl, GOOGLE_OAUTH_SCOPES, googleOAuthSetupRequired } from "@saltyfactory/integrations";
import { setupResponse, signOAuthState, workspaceId } from "../../../_shared";
import { studioAuthErrorResponse } from "../../../../_auth";

export async function GET(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const config = parseEnv();
    const setupRequired = googleOAuthSetupRequired(config);
    if (setupRequired.length) {
      return setupResponse("google_oauth", "Google OAuth requires server-side client config and encrypted credential storage.", setupRequired);
    }
    const state = signOAuthState({
      workspaceId,
      actorId: user.id,
      supabaseUserId: user.supabaseUserId,
      nonce: crypto.randomUUID(),
      expiresAt: Date.now() + 10 * 60 * 1000
    }, config.CREDENTIAL_ENCRYPTION_KEY);
    const authorizationUrl = buildGoogleAuthorizationUrl(config, state).toString();
    return NextResponse.json({ ok: true, status: "authorization_required", provider: "google_oauth", authorizationUrl, scopes: GOOGLE_OAUTH_SCOPES });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
