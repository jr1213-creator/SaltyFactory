import { NextResponse } from "next/server";
import {
  CUSTOMER_DESIGN_CANDIDATE_NOT_FOUND,
  CUSTOMER_DESIGN_CANDIDATE_BLOCKED,
  CUSTOMER_DESIGN_INVALID_BODY,
  CUSTOMER_DESIGN_INVALID_JSON,
  CUSTOMER_DESIGN_MARGIN_DATA_MISSING,
  CUSTOMER_DESIGN_PURCHASE_LINK_FORBIDDEN,
  CUSTOMER_DESIGN_PUBLISH_BLOCKED,
  CUSTOMER_DESIGN_RATE_LIMITED,
  CUSTOMER_DESIGN_SESSION_FORBIDDEN,
  CUSTOMER_DESIGN_SESSION_EXPIRED,
  CUSTOMER_DESIGN_SESSION_INVALID,
  CUSTOMER_DESIGN_SESSION_NOT_FOUND,
  CUSTOMER_DESIGN_SESSION_TERMINAL
} from "@saltyfactory/ai-free";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";

export const runtime = "nodejs";

export function customerDesignWorkspaceId() {
  const configured = process.env.STOREFRONT_WORKSPACE_ID?.trim();
  if (configured) return configured;
  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") throw new Error("customer_design_workspace_not_configured");
  return "wks_default";
}

export function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

export function stringField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function tokenFrom(req: Request, body: Record<string, unknown>) {
  return stringField(body, "sessionToken") || req.headers.get("x-customer-design-token")?.trim() || "";
}

export async function readRequiredJson(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
  try {
    const body = asRecord(await req.json());
    if (!Object.keys(body).length) throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
    return body;
  } catch (error) {
    if (error instanceof Error && error.message === CUSTOMER_DESIGN_INVALID_BODY) throw error;
    throw new Error(CUSTOMER_DESIGN_INVALID_JSON);
  }
}

export function customerDesignStatus(code: string) {
  if (code === CUSTOMER_DESIGN_INVALID_JSON || code === CUSTOMER_DESIGN_INVALID_BODY) return 400;
  if (code === CUSTOMER_DESIGN_SESSION_FORBIDDEN || code === CUSTOMER_DESIGN_SESSION_INVALID || code === CUSTOMER_DESIGN_PURCHASE_LINK_FORBIDDEN) return 403;
  if (code === CUSTOMER_DESIGN_SESSION_EXPIRED) return 410;
  if (code === CUSTOMER_DESIGN_RATE_LIMITED) return 429;
  if (code === CUSTOMER_DESIGN_SESSION_NOT_FOUND || code === CUSTOMER_DESIGN_CANDIDATE_NOT_FOUND) return 404;
  if (code === CUSTOMER_DESIGN_PUBLISH_BLOCKED || code === CUSTOMER_DESIGN_CANDIDATE_BLOCKED || code === CUSTOMER_DESIGN_MARGIN_DATA_MISSING || code === CUSTOMER_DESIGN_SESSION_TERMINAL) return 409;
  if (code === "customer_design_workspace_not_configured") return 503;
  return 500;
}

export function customerDesignError(error: unknown) {
  const code = error instanceof Error && error.message ? error.message : "customer_design_failed";
  return NextResponse.json({ ok: false, status: "blocked", code, message: code }, { status: customerDesignStatus(code) });
}

export async function withCustomerDesignRepos<T>(
  handler: (input: { repos: RepositoryBundle; workspaceId: string }) => Promise<T>
) {
  const workspaceId = customerDesignWorkspaceId();
  return handler({ repos: createRepositories(), workspaceId });
}
