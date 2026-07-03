import { studioAuthErrorResponse } from "../../_auth";
import { businessReadiness, getBusinessProfile, json, withBusinessRead } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => {
      const profile = await getBusinessProfile(repos);
      return json({ ok: true, readiness: businessReadiness(profile) });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
