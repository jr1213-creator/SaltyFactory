import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createManualTrendSourceBlockedResponse } from "@saltyfactory/integrations";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireProviderMutationPermission(req, workspaceId);
    await params;
    return NextResponse.json(createManualTrendSourceBlockedResponse(), { status: 409 });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
