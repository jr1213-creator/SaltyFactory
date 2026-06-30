import { createRepositories } from "@saltyfactory/db";
import type { SiteAuditResult } from "@saltyfactory/site-audit";

export const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export function siteAuditRunRow(result: SiteAuditResult, actorId: string) {
  return {
    id: `saudit_${Date.now()}`,
    workspace_id: workspaceId,
    status: "completed",
    website_url: result.url,
    overall_score: result.scores.overall,
    seo_score: result.scores.seo,
    aeo_score: result.scores.aeo,
    geo_score: result.scores.geo,
    structured_data_score: result.scores.structuredData,
    crawlability_score: result.scores.crawlability,
    product_schema_score: result.scores.productSchema,
    content_quality_score: result.scores.contentQuality,
    conversion_readiness_score: result.scores.conversionReadiness,
    indicators: result.indicators,
    evidence: result.evidence,
    recommended_fixes: result.recommendedFixes,
    priority_actions: result.priorityActions,
    audited_at: result.auditedAt,
    created_by: actorId,
    updated_by: actorId
  };
}

export function siteAuditFindingRows(result: SiteAuditResult) {
  return result.findings.map((finding, index) => ({
    id: `sfind_${Date.now()}_${index}`,
    workspace_id: workspaceId,
    severity: finding.severity,
    area: finding.area,
    message: finding.message,
    evidence: finding.evidence ?? null,
    status: "open"
  }));
}

export function siteAuditAuditEvent(runId: string, actorId: string) {
  return {
    id: `audit_${Date.now()}`,
    workspace_id: workspaceId,
    entity_type: "site_audit_run",
    entity_id: runId,
    action: "created",
    actor_type: "human",
    actor_id: actorId,
    created_at: new Date().toISOString()
  };
}

export async function getSiteAuditWithFindings(id: string) {
  const repos = createRepositories();
  const run = await repos.siteAudit.getById(id, workspaceId);
  if (!run) return null;
  const findings = (await repos.siteAudit.findings.listByWorkspace(workspaceId)).filter((finding) =>
    finding.audit_run_id === id || finding.auditRunId === id
  );
  return { run, findings };
}
