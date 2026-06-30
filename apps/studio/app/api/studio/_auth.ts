import { NextResponse } from "next/server";

export function studioAuthErrorResponse(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 500;
  if (status === 401) {
    return NextResponse.json(
      { ok: false, status: "unauthorized", message: "Authentication required." },
      { status: 401 }
    );
  }
  if (status === 403) {
    return NextResponse.json(
      { ok: false, status: "forbidden", message: "You do not have permission to perform this action." },
      { status: 403 }
    );
  }
  throw error;
}

export function notFoundApiResponse() {
  return NextResponse.json(
    { ok: false, status: "not_found", message: "Resource not found." },
    { status: 404 }
  );
}

export function notImplementedApiResponse(message = "This action is not implemented for this route yet.") {
  return NextResponse.json(
    { ok: false, status: "not_implemented", message },
    { status: 501 }
  );
}

export function providerDisabledApiResponse(message = "The required provider is disabled or not configured.") {
  return NextResponse.json(
    { ok: false, status: "provider_disabled", message },
    { status: 503 }
  );
}
