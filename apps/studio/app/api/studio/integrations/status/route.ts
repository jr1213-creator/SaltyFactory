import { NextResponse } from "next/server";
import { parseEnv } from "@saltyfactory/config";
import { getIntegrationStates, safeIntegrationStateForClient } from "@saltyfactory/integrations";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { studioAuthErrorResponse } from "../../_auth";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req);
    return NextResponse.json({
      ok: true,
      status: "retrieved",
      integrations: getIntegrationStates(parseEnv()).map(safeIntegrationStateForClient)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
