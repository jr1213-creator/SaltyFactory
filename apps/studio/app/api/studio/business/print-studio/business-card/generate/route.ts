import { studioAuthErrorResponse } from "../../../../_auth";
import { createBusinessCardPacket, json, withBusinessWrite } from "../../../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => json({ ok: true, status: "business_card_generated", ...(await createBusinessCardPacket(repos, body, user.id)) }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
