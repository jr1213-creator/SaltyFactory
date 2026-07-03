import { studioAuthErrorResponse } from "../../_auth";
import { businessReadiness, getBusinessProfile, json, withBusinessRead } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => {
      const profile = await getBusinessProfile(repos);
      const readiness = businessReadiness(profile);
      const actions = readiness.items.filter((item) => !item.passed).map((item) => ({
        title: `Complete ${item.label}`,
        route: "/studio/business/profile",
        reason: "Business readiness score is based on this real field."
      }));
      if (!actions.length) actions.push({ title: "Generate business legitimacy packet", route: "/studio/business/print-studio", reason: "Profile fields are ready for owner-reviewed documents." });
      return json({ ok: true, actions });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
