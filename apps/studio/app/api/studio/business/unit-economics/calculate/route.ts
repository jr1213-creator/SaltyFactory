import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../_auth";
import { calculateAndPersistUnitEconomics, withBusinessWrite } from "../../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const result = await calculateAndPersistUnitEconomics(repos, body, user.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 409 });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
