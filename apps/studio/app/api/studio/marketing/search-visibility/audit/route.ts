import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { buildReadinessScore, sanitizeKernelPayload } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";
import { sharedWorkspaceId } from "../../../shared/_shared";

export const runtime = "nodejs";

async function readBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

function checked(body: Record<string, unknown>, key: string) {
  return body[key] === "on" || body[key] === "true" || body[key] === true;
}

function safeRedirectUrl(req: Request, next: unknown) {
  const value = String(next ?? "").trim();
  if (!value || !value.startsWith("/studio/") || value.includes("//")) return null;
  return new URL(value, req.url);
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, sharedWorkspaceId);
    const body = sanitizeKernelPayload(await readBody(req)) as Record<string, unknown>;
    const repos = createRepositories();
    const auditId = `search_visibility_${Date.now()}`;
    const criteria = [
      { key: "robots", label: "robots.txt / AI bot access readiness", passed: checked(body, "robots"), blocker: "Review robots.txt and crawl access." },
      { key: "llms", label: "llms.txt presence and depth", passed: checked(body, "llms"), blocker: "Draft/update llms.txt without treating it as a ranking guarantee." },
      { key: "schema", label: "JSON-LD / Schema.org richness", passed: checked(body, "schema"), blocker: "Add product, organization, website, breadcrumb, and FAQ schema where appropriate." },
      { key: "entity", label: "Brand/entity coherence", passed: checked(body, "entity"), blocker: "Align brand/entity descriptions across owned surfaces." },
      { key: "crawlable", label: "Server-rendered crawlable content", passed: checked(body, "crawlable"), blocker: "Make important content crawlable without client-only dependency." },
      { key: "metadata", label: "Metadata completeness", passed: checked(body, "metadata"), blocker: "Complete titles, descriptions, canonical URLs, OG/Twitter/Pinterest metadata." },
      { key: "proof", label: "Proof/source visibility", passed: checked(body, "proof"), blocker: "Attach proof/source labels to claims before publishing." }
    ];
    const score = buildReadinessScore({ id: `score_seo_geo_${auditId}`, workspaceId: sharedWorkspaceId, entityType: "search_visibility", entityId: auditId, scoreType: "seo_geo", criteria });
    await repos.shared.readinessScores.create(score);
    const report = await repos.shared.exportPackages.create({
      id: `export_seo_${auditId}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "search_visibility",
      entity_id: auditId,
      package_type: "seo_report",
      title: "Search/AEO/GEO Readiness Report",
      content: {
        featureClassification: "manual_export_ready_feature",
        score,
        disclaimers: ["No ranking guarantees.", "No AI search visibility guarantees.", "No external crawling was performed."],
        ownedSurfaceConsistency: "Review homepage, products/offers, campaign copy, social bios/drafts, email copy, ad copy, FAQ blocks, and proof pack claims."
      },
      status: "ready_for_review",
      created_by: user.id
    });
    await Promise.all((score.blockers as string[]).map((blocker, index) => repos.shared.tasks.create({
      id: `task_${auditId}_${index}`,
      workspace_id: sharedWorkspaceId,
      entity_type: "search_visibility",
      entity_id: auditId,
      title: blocker,
      status: "pending",
      priority: index < 2 ? "high" : "normal",
      created_by: user.id
    })));
    const redirectUrl = safeRedirectUrl(req, body.next);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, status: "ready_for_review", score, reportId: report.id });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
