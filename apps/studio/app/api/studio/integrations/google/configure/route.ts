import { NextResponse } from "next/server";
import { z } from "zod";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { validateGoogleConfiguration } from "@saltyfactory/domain";
import { createRepositories } from "@saltyfactory/db";
import { configureGoogleWorkspace } from "@saltyfactory/integrations";
import { sanitizeProviderError } from "@saltyfactory/security";
import { workspaceId } from "../../_shared";
import { studioAuthErrorResponse } from "../../../_auth";

const bodySchema = z.object({
  ga4_property_id: z.string().trim().max(120).optional(),
  search_console_site_url: z.string().trim().max(500).optional(),
  gbp_account_id: z.string().trim().max(200).optional(),
  gbp_location_id: z.string().trim().max(300).optional()
});

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ ok: false, status: "blocked", message: "Invalid Google integration configuration." }, { status: 400 });
    const validationInput: Parameters<typeof validateGoogleConfiguration>[0] = {};
    if (parsed.data.ga4_property_id !== undefined) validationInput.ga4PropertyId = parsed.data.ga4_property_id;
    if (parsed.data.search_console_site_url !== undefined) validationInput.searchConsoleSiteUrl = parsed.data.search_console_site_url;
    if (parsed.data.gbp_account_id !== undefined) validationInput.gbpAccountId = parsed.data.gbp_account_id;
    if (parsed.data.gbp_location_id !== undefined) validationInput.gbpLocationId = parsed.data.gbp_location_id;
    const validation = validateGoogleConfiguration(validationInput);
    if (!validation.ok) return NextResponse.json({ ok: false, status: "blocked", provider: "google_oauth", validation }, { status: 400 });
    const values: Parameters<typeof configureGoogleWorkspace>[0]["values"] = {};
    if (parsed.data.ga4_property_id !== undefined) values.ga4PropertyId = parsed.data.ga4_property_id;
    if (parsed.data.search_console_site_url !== undefined) values.searchConsoleSiteUrl = parsed.data.search_console_site_url;
    if (parsed.data.gbp_account_id !== undefined) values.businessProfileAccountId = parsed.data.gbp_account_id;
    if (parsed.data.gbp_location_id !== undefined) values.businessProfileLocationId = parsed.data.gbp_location_id;
    const result = await configureGoogleWorkspace({
      repos: createRepositories(),
      workspaceId,
      actorId: user.id,
      config: parseEnv(),
      values
    });
    return NextResponse.json(result);
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "error", provider: "google_oauth", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
