import { startStudioMagicLink } from "@saltyfactory/auth";
import { NextResponse } from "next/server";

const safeError = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: Request) {
  const fd = await req.formData();
  const email = String(fd.get("email") || "");
  const redirectTo = new URL("/auth/callback", req.url).toString();

  try {
    await startStudioMagicLink(email, redirectTo);
    return NextResponse.json({ ok: true, message: "check_email" });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 403;
    if (status === 503) return safeError(503, "supabase_auth_not_configured");
    if (status === 401 || status === 403) return safeError(401, "not_authorized");
    return safeError(403, "forbidden");
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
}
