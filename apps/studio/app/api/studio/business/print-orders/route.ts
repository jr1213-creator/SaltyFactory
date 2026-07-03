import { studioAuthErrorResponse } from "../../_auth";
import { json, withBusinessRead, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, printOrders: await repos.business.printOrders.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
