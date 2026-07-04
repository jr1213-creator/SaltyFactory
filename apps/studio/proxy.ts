import { NextResponse, type NextRequest } from "next/server";

const fixedStudioSessionCookies = new Set(["sb-access-token", "sb-refresh-token"]);

function isAlwaysAllowed(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/auth/callback" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/studio/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]{2,8}$/i.test(pathname)
  );
}

function isSupabaseSessionCookieName(name: string) {
  if (fixedStudioSessionCookies.has(name)) return true;
  if (!name.startsWith("sb-")) return false;
  if (name.includes("code-verifier")) return false;
  return /(?:^|-)auth-token(?:$|\.)/.test(name);
}

function cookieNamesFromHeader(header: string) {
  return header
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name): name is string => Boolean(name));
}

function hasStudioSessionCookie(request: NextRequest) {
  const cookieStore = (request as NextRequest & { cookies?: { getAll?: () => { name: string }[] } }).cookies;
  if (cookieStore?.getAll) return cookieStore.getAll().some((cookie) => isSupabaseSessionCookieName(cookie.name));
  const header = request.headers.get("cookie") || "";
  return cookieNamesFromHeader(header).some(isSupabaseSessionCookieName);
}

function hasGuardedPlaywrightAuthBypass() {
  return (
    process.env.PLAYWRIGHT_AUTH_BYPASS === "true" &&
    (process.env.NODE_ENV === "test" || process.env.APP_ENV === "test") &&
    process.env.APP_ENV !== "production"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/api/studio/login";
  const isLogoutRoute = pathname === "/api/studio/logout";
  const authorized = isAlwaysAllowed(pathname) || isLoginRoute || isLogoutRoute || hasGuardedPlaywrightAuthBypass() || hasStudioSessionCookie(request);

  if (pathname.startsWith("/api/studio") && !isLoginRoute && !isLogoutRoute && !authorized) {
    return NextResponse.json(
      { ok: false, status: "unauthorized", message: "Authentication required." },
      { status: 401 }
    );
  }

  if (pathname.startsWith("/studio") && !authorized) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/api/studio/:path*"]
};
