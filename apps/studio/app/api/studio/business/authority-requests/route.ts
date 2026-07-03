import { studioAuthErrorResponse } from "../../_auth";
import { createAuthorityRequest, json, withBusinessRead, withBusinessWrite, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, authorityRequests: await repos.business.authorityRequests.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => json({ ok: true, status: "pending", authorityRequest: await createAuthorityRequest(repos, body, user.id) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
