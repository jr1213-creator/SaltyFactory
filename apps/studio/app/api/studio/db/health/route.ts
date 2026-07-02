import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@saltyfactory/auth";
import { checkRuntimeDatabaseConnection } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../_auth";
import { classifyStudioDataError, sanitizeStudioDataError } from "../../../../studio/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorStatus(error: unknown) {
  return typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 0;
}

function errorCode(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current === "object") {
      const record = current as { code?: unknown; cause?: unknown };
      if (record.code) return String(record.code);
      current = record.cause;
      continue;
    }
    break;
  }
  return "";
}

function healthErrorResponse(error: unknown) {
  const category = classifyStudioDataError(error);
  const message = sanitizeStudioDataError(error)
    .replace(/\nparams:[\s\S]*/i, "\nparams: [redacted]")
    .slice(0, 360);
  return NextResponse.json({
    ok: false,
    connected: false,
    category,
    code: errorCode(error) || null,
    message
  }, { status: 503 });
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req);
  } catch (error) {
    const status = errorStatus(error);
    if (status === 401 || status === 403) return studioAuthErrorResponse(error);
    return healthErrorResponse(error);
  }

  try {
    await checkRuntimeDatabaseConnection();
    return NextResponse.json({ ok: true, connected: true, category: "connected" });
  } catch (error) {
    return healthErrorResponse(error);
  }
}
