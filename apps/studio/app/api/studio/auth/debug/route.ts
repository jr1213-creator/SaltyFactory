import { getStudioAuthDebug } from "@saltyfactory/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, status: "disabled" }, { status: 404 });
  }

  const debug = await getStudioAuthDebug(req);
  return NextResponse.json({ ok: true, ...debug });
}
