import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import {
  GOOGLE_ANALYTICS_SETUP_SCOPES,
  GOOGLE_MERCHANT_CENTER_SETUP_SCOPES,
  GOOGLE_OAUTH_SCOPES,
  GOOGLE_SEARCH_CONSOLE_SETUP_SCOPES,
  buildGoogleAuthorizationUrl,
  checkGoogleBusinessProfileEligibilityForSaltyCowhide,
  googleOAuthSetupRequired,
  setupGoogleAnalyticsForSaltyCowhide,
  setupMerchantCenterForSaltyCowhide,
  setupSearchConsoleForSaltyCowhide
} from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { setupResponse, signOAuthState, workspaceId } from "../../_shared";
import { studioAuthErrorResponse } from "../../../_auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["ga4_create", "search_console_add", "merchant_center_setup", "gbp_eligibility"]),
  eligibility: z.enum(["online_only_ecommerce_pod", "local_storefront", "service_area_business", "local_pickup_studio_showroom", "markets_popups_events"]).optional()
});

function setupScopes(action: z.infer<typeof bodySchema>["action"]) {
  if (action === "ga4_create") return [...GOOGLE_OAUTH_SCOPES, ...GOOGLE_ANALYTICS_SETUP_SCOPES];
  if (action === "search_console_add") return [...GOOGLE_OAUTH_SCOPES, ...GOOGLE_SEARCH_CONSOLE_SETUP_SCOPES];
  if (action === "merchant_center_setup") return [...GOOGLE_OAUTH_SCOPES, ...GOOGLE_MERCHANT_CENTER_SETUP_SCOPES];
  return GOOGLE_OAUTH_SCOPES;
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ ok: false, status: "blocked", provider: "google_oauth", message: "Invalid Google setup action." }, { status: 400 });
    const config = parseEnv();
    const setupRequired = googleOAuthSetupRequired(config);
    if (setupRequired.length) return setupResponse("google_oauth", "Google setup requires server-side OAuth config and encrypted credential storage.", setupRequired);
    const state = signOAuthState({
      workspaceId,
      actorId: user.id,
      supabaseUserId: user.supabaseUserId,
      purpose: parsed.data.action,
      nonce: crypto.randomUUID(),
      expiresAt: Date.now() + 10 * 60 * 1000
    }, config.CREDENTIAL_ENCRYPTION_KEY);
    const authorizationUrl = buildGoogleAuthorizationUrl(config, state, setupScopes(parsed.data.action)).toString();
    const common = { repos: createRepositories(), workspaceId, actorId: user.id, config, authorizationUrl };
    const result =
      parsed.data.action === "ga4_create" ? await setupGoogleAnalyticsForSaltyCowhide(common) :
      parsed.data.action === "search_console_add" ? await setupSearchConsoleForSaltyCowhide(common) :
      parsed.data.action === "merchant_center_setup" ? await setupMerchantCenterForSaltyCowhide(common) :
      await checkGoogleBusinessProfileEligibilityForSaltyCowhide({ repos: common.repos, workspaceId, actorId: user.id, config, eligibility: parsed.data.eligibility ?? "online_only_ecommerce_pod" });
    return NextResponse.json(result, { status: result.ok ? 200 : result.status === "auth_required" ? 401 : result.status === "requires_scope" ? 409 : 503 });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "error", provider: "google_oauth", message: sanitizeProviderError(error) }, { status: 502 });
    }
  }
}
