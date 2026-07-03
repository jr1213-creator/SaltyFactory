import { studioAuthErrorResponse } from "../../_auth";
import { getBusinessProfile, json, saveBusinessProfile, withBusinessRead, withBusinessWrite } from "../_shared";

export async function GET(req: Request) {
  try {
    return withBusinessRead(req, async (repos) => json({ ok: true, profile: await getBusinessProfile(repos) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => json({ ok: true, status: "saved", profile: await saveBusinessProfile(repos, body, user.id) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  return PATCH(req);
}
