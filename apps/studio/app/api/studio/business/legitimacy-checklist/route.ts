import { studioAuthErrorResponse } from "../../_auth";
import { businessReadiness, getBusinessProfile, json, withBusinessRead } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => {
      const profile = await getBusinessProfile(repos);
      const readiness = businessReadiness(profile);
      return json({
        ok: true,
        checklist: [
          ...readiness.items,
          { label: "Novo banking selected", status: String(profile?.banking_provider_name ?? profile?.bankingProviderName ?? "") === "novo" ? "selected" : "missing", passed: String(profile?.banking_provider_name ?? profile?.bankingProviderName ?? "") === "novo" },
          { label: "Sensitive fields authority model", status: "active", passed: true },
          { label: "Business card packet", status: "create in Print Studio", passed: false }
        ]
      });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
