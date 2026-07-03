import { studioAuthErrorResponse } from "../../../_auth";
import { json, withBusinessRead, workspaceId } from "../../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, accounts: await repos.business.bankConnections.listByWorkspace(workspaceId), readOnly: true }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
