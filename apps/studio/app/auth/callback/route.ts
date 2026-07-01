import { exchangeSupabaseAuthCode } from "@saltyfactory/auth";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";

type RouteRequest = Request & { cookies?: { getAll?: () => { name: string; value: string }[] } };

export async function GET(req: RouteRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", req.url));

  try {
    const response = NextResponse.redirect(new URL("/studio", req.url));
    const cookies = {
      getAll: () => req.cookies?.getAll?.() ?? [],
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      }
    };
    await exchangeSupabaseAuthCode(code, cookies);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=callback_failed", req.url));
  }
}
