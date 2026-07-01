import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";

export const studioWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export function suggestionMetadata(row: WorkspaceRow) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
  return metadata.kind === "design_suggestion" ? metadata : null;
}

export function toDesignSuggestion(row: WorkspaceRow) {
  const metadata = suggestionMetadata(row) ?? {};
  return {
    id: row.id,
    workspace_id: row.workspace_id ?? row.workspaceId,
    cluster_id: row.cluster_id ?? row.clusterId,
    title: metadata.title ?? row.text,
    concept_summary: metadata.conceptSummary ?? metadata.concept_summary ?? "",
    suggested_phrase: metadata.suggestedPhrase ?? metadata.suggested_phrase ?? row.text,
    product_type: metadata.productType ?? metadata.product_type ?? "tee",
    target_audience: metadata.targetAudience ?? metadata.target_audience ?? "",
    style_keywords: metadata.styleKeywords ?? metadata.style_keywords ?? [],
    color_palette: metadata.colorPalette ?? metadata.color_palette ?? [],
    recommended_products: metadata.recommendedProducts ?? metadata.recommended_products ?? [],
    print_constraints: metadata.printConstraints ?? metadata.print_constraints ?? [],
    risk_notes: metadata.riskNotes ?? metadata.risk_notes ?? row.notes ?? [],
    source_evidence: metadata.sourceEvidence ?? metadata.source_evidence ?? [],
    scores: metadata.scores ?? {},
    prompt_injection_flagged: Boolean(metadata.promptInjectionFlagged ?? metadata.prompt_injection_flagged),
    status: row.status,
    approved_for_design: Boolean(row.approved_for_design ?? row.approvedForDesign),
    approved_by: row.approved_by ?? row.approvedBy ?? null,
    approved_at: row.approved_at ?? row.approvedAt ?? null,
    reviewer_notes: row.notes ?? "",
    created_at: row.created_at ?? row.createdAt,
    updated_at: row.updated_at ?? row.updatedAt
  };
}

export async function listDesignSuggestions(repos: RepositoryBundle, workspaceId = studioWorkspaceId) {
  const rows = await repos.phrase.listByWorkspace(workspaceId);
  return rows
    .filter((row) => Boolean(suggestionMetadata(row)))
    .map(toDesignSuggestion)
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
}

export async function getDesignSuggestion(repos: RepositoryBundle, id: string, workspaceId = studioWorkspaceId) {
  const row = await repos.phrase.getById(id, workspaceId);
  if (!row || !suggestionMetadata(row)) return null;
  return row;
}

export function safeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "manual-topic";
}
