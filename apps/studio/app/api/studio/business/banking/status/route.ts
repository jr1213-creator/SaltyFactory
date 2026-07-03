import { studioAuthErrorResponse } from "../../../_auth";
import { json, providerBoundaryStatus, withBusinessRead, workspaceId } from "../../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => {
      const connections = await repos.business.bankConnections.listByWorkspace(workspaceId);
      return json({
        ok: true,
        status: connections.length ? "configured_records_present" : "not_configured",
        connections,
        providerBoundaries: {
          novo: providerBoundaryStatus("novo"),
          plaid: providerBoundaryStatus("plaid"),
          moneyMovement: "not_implemented_read_only_v1"
        }
      });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
