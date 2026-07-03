import { studioAuthErrorResponse } from "../../_auth";
import { businessReadiness, getBusinessProfile, json, withBusinessRead, workspaceId } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => {
      const profile = await getBusinessProfile(repos);
      const unitEconomics = await repos.business.unitEconomics.listByWorkspace(workspaceId);
      const opportunities = await repos.business.opportunities.listByWorkspace(workspaceId);
      const authorityRequests = await repos.business.authorityRequests.listByWorkspace(workspaceId);
      return json({
        ok: true,
        profile,
        readiness: businessReadiness(profile),
        counts: {
          unitEconomics: unitEconomics.length,
          opportunities: opportunities.length,
          pendingAuthority: authorityRequests.filter((row) => row.status === "pending").length
        }
      });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
