import { startStudioMagicLink } from "@saltyfactory/auth";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

type RouteRequest = Request & { cookies?: { getAll?: () => { name: string; value: string }[] } };

const safeError = (status: number, error: string) => NextResponse.json({ ok: false, status: error }, { status });

export async function POST(req: RouteRequest) {
  const fd = await req.formData();
  const email = String(fd.get("email") || "");
  const redirectTo = new URL("/auth/callback", req.url).toString();
  const response = NextResponse.json({ ok: true, status: "email_sent" });
  const cookies = {
    getAll: () => req.cookies?.getAll?.() ?? [],
    setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) => {
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    }
  };

  try {
    await startStudioMagicLink(email, redirectTo, cookies);
    return response;
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 403;
    if (status === 503) return safeError(503, "not_configured");
    if (status === 401 || status === 403) return safeError(401, "not_authorized");
    return safeError(403, "forbidden");
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: { Allow: "POST" } });
}
