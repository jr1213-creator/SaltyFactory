import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { runSiteAudit } from "@saltyfactory/site-audit";
import { studioAuthErrorResponse } from "../../_auth";
import { siteAuditAuditEvent, siteAuditFindingRows, siteAuditRunRow, workspaceId } from "../_shared";

function safeAuditError(error: unknown) {
  const message = error instanceof Error ? error.message : "site_audit_failed";
  const status = [
    "invalid_url",
    "blocked_private_target",
    "blocked_redirect_target",
    "too_many_redirects",
    "response_too_large"
  ].includes(message) ? 400 : message === "fetch_timeout" ? 504 : 502;
  return NextResponse.json({
    ok: false,
    status: "blocked",
    message: "Site audit could not run safely.",
    blockingReasons: [message]
  }, { status });
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const websiteUrl = String(body.websiteUrl || body.website_url || "");
    const result = await runSiteAudit({
      websiteUrl,
      sitemapUrl: typeof body.sitemapUrl === "string" ? body.sitemapUrl : undefined,
      brandName: typeof body.brandName === "string" ? body.brandName : undefined,
      targetKeywords: Array.isArray(body.targetKeywords) ? body.targetKeywords.map(String) : [],
      competitorUrls: Array.isArray(body.competitorUrls) ? body.competitorUrls.map(String) : []
    }).catch((error) => {
      throw Object.assign(error instanceof Error ? error : new Error("site_audit_failed"), { siteAuditError: true });
    });
    const run = siteAuditRunRow(result, user.id);
    const created = await createRepositories().siteAudit.createRun(run, siteAuditFindingRows(result), siteAuditAuditEvent(run.id, user.id));
    return NextResponse.json({ ok: true, status: "success", audit: created, result });
  } catch (error) {
    if (typeof error === "object" && error && "siteAuditError" in error) return safeAuditError(error);
    return studioAuthErrorResponse(error);
  }
}
