import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { getCustomerDesignSessionDetail, listCustomerDesignSessions, updateCustomerSpecificProductReview } from "@saltyfactory/ai-free";
import { readJsonOrFormBody, shopManagerWorkspaceId, stringField } from "../_shop-manager-agent-os";

export const runtime = "nodejs";

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

function failure(error: unknown) {
  const code = error instanceof Error && error.message ? error.message : "customer_design_owner_route_failed";
  const status = code === "unauthenticated" ? 401 : code === "forbidden" || code === "workspace_access_denied" ? 403 : code.includes("not_found") ? 404 : code.includes("invalid") ? 400 : 500;
  return NextResponse.json({ ok: false, status: "blocked", code, message: code }, { status });
}

export async function getOwnerCustomerDesignSessions(req: Request) {
  try {
    await requireWorkspaceMember(req, shopManagerWorkspaceId);
    const sessions = await listCustomerDesignSessions({ repos: createRepositories(), workspaceId: shopManagerWorkspaceId });
    return NextResponse.json({ ok: true, sessions });
  } catch (error) {
    return failure(error);
  }
}

export async function getOwnerCustomerDesignSession(req: Request, sessionId: string) {
  try {
    await requireWorkspaceMember(req, shopManagerWorkspaceId);
    const detail = await getCustomerDesignSessionDetail({
      repos: createRepositories(),
      workspaceId: shopManagerWorkspaceId,
      sessionId,
      ownerView: true
    });
    return NextResponse.json({ ok: true, detail });
  } catch (error) {
    return failure(error);
  }
}

export async function updateOwnerCustomerSpecificProduct(req: Request, productId: string, status: "pending_review" | "approved" | "rejected") {
  try {
    const user = await requireDraftMutationPermission(req, shopManagerWorkspaceId);
    const body = asRecord(await readJsonOrFormBody(req));
    if (Object.keys(body).length && stringField(body, "confirm") && stringField(body, "confirm") !== status) {
      throw new Error("customer_design_invalid_body");
    }
    const product = await updateCustomerSpecificProductReview({
      repos: createRepositories(),
      workspaceId: shopManagerWorkspaceId,
      actorId: user.id,
      productId,
      status
    });
    return NextResponse.json({ ok: true, product, promotedToPublic: false });
  } catch (error) {
    return failure(error);
  }
}
