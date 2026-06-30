import { exchangeSupabaseAuthCode, supabaseSessionCookies } from "@saltyfactory/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=callback_failed", req.url));

  try {
    const session = await exchangeSupabaseAuthCode(code);
    const response = NextResponse.redirect(new URL("/studio", req.url));
    for (const cookie of supabaseSessionCookies(session)) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=callback_failed", req.url));
  }
}
