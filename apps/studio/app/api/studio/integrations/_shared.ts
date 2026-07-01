import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { requireProviderMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import { createIntegrationProviders, createSyncRun, getIntegrationStates, safeIntegrationStateForClient, upsertProviderConnection, type IntegrationKey } from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../_auth";

export const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export function providerFromParam(value: string): IntegrationKey {
  const normalized = value.replace(/-/g, "_");
  const aliases: Record<string, IntegrationKey> = {
    search_console: "google_search_console",
    google_search_console: "google_search_console",
    google_business: "google_business_profile",
    google_business_profile: "google_business_profile",
    shopify_admin: "shopify",
    shopify_storefront: "shopify",
    huggingface: "hugging_face"
  };
  return (aliases[normalized] ?? normalized) as IntegrationKey;
}

export function getProviderState(provider: IntegrationKey) {
  return getIntegrationStates(parseEnv()).find((state) => state.key === provider || state.key === providerFromParam(String(provider)));
}

export function setupResponse(provider: string, message: string, setupRequired: string[] = [], status = 503) {
  return NextResponse.json({ ok: false, status: setupRequired.length ? "not_configured" : "unsupported", provider, message, setupRequired }, { status });
}

export async function handleProviderStatus(req: Request, provider: IntegrationKey) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    const state = getProviderState(provider);
    if (!state) return setupResponse(provider, "Unknown provider.", [], 404);
    const persisted = await repos.integration.getProviderConnectionForWorkspace(workspaceId, state.key);
    return NextResponse.json({ ok: true, status: "retrieved", provider: state.key, integration: safeIntegrationStateForClient(state), connection: persisted ? { ...persisted, secret_ref: persisted.secret_ref ? "[stored]" : null, secretRef: persisted.secretRef ? "[stored]" : null } : null });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function handleProviderTest(req: Request, provider: IntegrationKey) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const config = parseEnv();
    const state = getProviderState(provider);
    if (!state) return setupResponse(provider, "Unknown provider.", [], 404);
    const providers = createIntegrationProviders(config);
    const adapter = (providers as any)[state.key] ?? (providers as any)[provider];
    const result = adapter?.test ? await adapter.test() : { ok: false, status: "unsupported", message: `${state.label} test adapter is not implemented.`, setupRequired: state.setupRequired };
    const repos = createRepositories();
    await upsertProviderConnection({ repos, workspaceId, actorId: user.id, state });
    await repos.integration.updateProviderConnectionStatus(workspaceId, state.key, {
      id: `conn_${state.key}_${Date.now()}`,
      workspace_id: workspaceId,
      provider_type: state.key,
      provider_name: state.label,
      enabled: state.status !== "disabled" && state.status !== "unsupported",
      status: result.ok ? "connected" : result.status,
      last_health_check_at: new Date().toISOString(),
      last_health_check_status: result.ok ? "success" : result.status,
      configuration: { capabilities: state.capabilities, setupRequired: state.setupRequired }
    });
    return NextResponse.json({ ok: result.ok, status: result.ok ? "success" : result.status, provider: state.key, message: result.ok ? "Provider connection was validated by a live adapter." : result.message, setupRequired: result.ok ? [] : result.setupRequired ?? state.setupRequired });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function handleProviderSync(req: Request, provider: IntegrationKey) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const state = getProviderState(provider);
    if (!state) return setupResponse(provider, "Unknown provider.", [], 404);
    const repos = createRepositories();
    const providers = createIntegrationProviders(parseEnv());
    const adapter = (providers as any)[state.key] ?? (providers as any)[provider];
    const result = adapter?.sync ? await adapter.sync() : { ok: false, status: "unsupported", message: `${state.label} sync adapter is not implemented.`, setupRequired: state.setupRequired };
    const syncRun = await createSyncRun({ repos, workspaceId, providerKey: state.key, syncType: "manual", actorId: user.id, status: result.ok ? "completed" : "blocked", error: result.ok ? undefined : result.message, setupRequired: result.ok ? [] : result.setupRequired ?? state.setupRequired });
    return NextResponse.json({ ok: false, status: result.ok ? "blocked" : result.status, provider: state.key, message: result.ok ? "Live sync is intentionally blocked until provider import adapters are fully implemented." : result.message, setupRequired: result.ok ? [] : result.setupRequired ?? state.setupRequired, syncRun });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function handleManualCredentialConnect(req: Request, provider: IntegrationKey) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    const state = getProviderState(provider);
    if (!state) return setupResponse(provider, "Unknown provider.", [], 404);
    if (!token) return setupResponse(provider, "Credential token is required for manual connection.", state.setupRequired, 400);
    const config = parseEnv();
    if (!config.CREDENTIAL_ENCRYPTION_KEY) return setupResponse(provider, "Encrypted credential storage is not configured.", ["CREDENTIAL_ENCRYPTION_KEY"], 503);
    const repos = createRepositories();
    const connection = await upsertProviderConnection({ repos, workspaceId, actorId: user.id, state: { ...state, status: "configured" }, credentialSecret: token, encryptionKey: config.CREDENTIAL_ENCRYPTION_KEY });
    return NextResponse.json({ ok: true, status: "configured", provider: state.key, connection: { id: connection.id, workspace_id: workspaceId, provider: state.key, credential_ref: connection.secret_ref ? "[stored]" : null } });
  } catch (error) {
    return NextResponse.json({ ok: false, status: "error", message: sanitizeProviderError(error) }, { status: 500 });
  }
}

export function signOAuthState(payload: Record<string, unknown>, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(value: string, secret: string) {
  const [body, sig] = value.split(".");
  if (!body || !sig) throw new Error("invalid_oauth_state");
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error("invalid_oauth_state");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>;
}
