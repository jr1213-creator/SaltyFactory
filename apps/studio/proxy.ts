import { NextResponse, type NextRequest } from "next/server";
import { requireStudioUser } from "@saltyfactory/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/api/studio/login";
  const isLogoutRoute = pathname === "/api/studio/logout";
  const isAuthDebugRoute = pathname === "/api/studio/auth/debug";
  let authorized = isLoginRoute || isLogoutRoute || isAuthDebugRoute;
  let authStatus = 401;

  if (!authorized) {
    try {
      await requireStudioUser(request);
      authorized = true;
    } catch (error) {
      authStatus = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 401;
    }
  }

  if (pathname.startsWith("/api/studio") && !isLoginRoute && !isLogoutRoute && !authorized) {
    if (authStatus === 403) {
      return NextResponse.json(
        { ok: false, status: "forbidden", message: "You do not have permission to perform this action." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { ok: false, status: "unauthorized", message: "Authentication required." },
      { status: 401 }
    );
  }

  if (pathname.startsWith("/studio") && !authorized) {
    const target = authStatus === 403 ? "/login?error=missing_membership" : "/login";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/api/studio/:path*"]
};
