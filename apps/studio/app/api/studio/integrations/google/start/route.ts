import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { setupResponse, signOAuthState, workspaceId } from "../../_shared";

const scopes = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly"
];

export async function GET(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const config = parseEnv();
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_OAUTH_REDIRECT_URI || !config.CREDENTIAL_ENCRYPTION_KEY) {
      return setupResponse("google_oauth", "Google OAuth requires client id, redirect URI, and credential encryption.", ["GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_REDIRECT_URI", "CREDENTIAL_ENCRYPTION_KEY"]);
    }
    const state = signOAuthState({ workspaceId, actorId: user.id, nonce: Date.now() }, config.CREDENTIAL_ENCRYPTION_KEY);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", config.GOOGLE_OAUTH_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    return NextResponse.json({ ok: true, status: "authorization_required", provider: "google_oauth", authorizationUrl: url.toString(), scopes });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 500;
    return NextResponse.json({ ok: false, status: status === 401 ? "unauthorized" : "forbidden", message: "Authentication required." }, { status });
  }
}
