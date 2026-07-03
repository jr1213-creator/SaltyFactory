import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../_auth";
import { providerBoundaryStatus, withBusinessWrite } from "../../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async () => NextResponse.json(providerBoundaryStatus("plaid"), { status: 503 }));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
