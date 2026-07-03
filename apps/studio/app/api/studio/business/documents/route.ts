import { studioAuthErrorResponse } from "../../_auth";
import { json, withBusinessRead, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, documents: await repos.business.documents.listByWorkspace(workspaceId), exports: await repos.business.documentExports.listByWorkspace(workspaceId) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
