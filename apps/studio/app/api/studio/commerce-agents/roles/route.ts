import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { listCommerceAgentRoles, registerCommerceAgentRoles } from "@saltyfactory/ai-free";
import { shopManagerWorkspaceId } from "../../_shop-manager-agent-os";
import { studioAuthErrorResponse } from "../../_auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await requireWorkspaceMember(req, shopManagerWorkspaceId);
    const repos = createRepositories();
    await registerCommerceAgentRoles({ repos, workspaceId: shopManagerWorkspaceId, actorId: user.id });
    return NextResponse.json({ ok: true, roles: await listCommerceAgentRoles({ repos, workspaceId: shopManagerWorkspaceId }) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
