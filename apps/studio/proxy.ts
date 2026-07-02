import { NextResponse, type NextRequest } from "next/server";

const studioSessionCookies = ["sb-access-token", "sb-refresh-token"];

function hasStudioSessionCookie(request: NextRequest) {
  const cookieStore = (request as NextRequest & { cookies?: { get(name: string): { value?: string } | undefined } }).cookies;
  if (cookieStore?.get) return studioSessionCookies.some((name) => Boolean(cookieStore.get(name)?.value));
  const header = request.headers.get("cookie") || "";
  return studioSessionCookies.some((name) => new RegExp(`(?:^|;\\s*)${name}=`).test(header));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/api/studio/login";
  const isLogoutRoute = pathname === "/api/studio/logout";
  const isAuthDebugRoute = pathname === "/api/studio/auth/debug";
  const authorized = isLoginRoute || isLogoutRoute || isAuthDebugRoute || hasStudioSessionCookie(request);

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
