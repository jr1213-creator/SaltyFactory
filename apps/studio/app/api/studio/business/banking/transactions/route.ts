import { studioAuthErrorResponse } from "../../../_auth";
import { json, withBusinessRead, workspaceId } from "../../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, transactions: await repos.business.bankTransactions.listByWorkspace(workspaceId), readOnly: true }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
