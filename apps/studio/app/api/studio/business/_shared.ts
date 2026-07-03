import { NextResponse } from "next/server";
import { requireApprovalPermission, requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, type RepositoryBundle, type WorkspaceRow } from "@saltyfactory/db";
import { calculateProductMarketingReadiness, calculateUnitEconomics, maskSensitiveValue, redactBusinessSensitiveFields } from "@saltyfactory/domain";

export const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const nowId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function parseRequestBody(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return await req.json().catch(() => ({}));
  if (contentType.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, typeof value === "string" ? value : value.name]));
  }
  return await req.json().catch(() => ({}));
}

export async function withBusinessRead(req: Request, handler: (repos: RepositoryBundle, user: { id: string }) => Promise<Response>) {
  const user = await requireWorkspaceMember(req, workspaceId);
  return handler(createRepositories(), user);
}

export async function withBusinessWrite(req: Request, handler: (repos: RepositoryBundle, user: { id: string }, body: Record<string, unknown>) => Promise<Response>) {
  const user = await requireDraftMutationPermission(req, workspaceId);
  const body = await parseRequestBody(req);
  return handler(createRepositories(), user, body);
}

export async function withBusinessApproval(req: Request, handler: (repos: RepositoryBundle, user: { id: string }, body: Record<string, unknown>) => Promise<Response>) {
  const user = await requireApprovalPermission(req, workspaceId);
  const body = await parseRequestBody(req);
  return handler(createRepositories(), user, body);
}

export function redactRows(rows: WorkspaceRow[]) {
  return rows.map((row) => redactBusinessSensitiveFields(row));
}

export async function getBusinessProfile(repos: RepositoryBundle) {
  const profiles = await repos.business.profiles.listByWorkspace(workspaceId);
  return profiles[0] ? redactBusinessSensitiveFields(profiles[0]) : null;
}

export async function createBusinessAudit(repos: RepositoryBundle, input: { actorId: string; entityType: string; entityId: string; action: string; notes?: string }) {
  await repos.audit.write({
    id: nowId("audit_business"),
    workspace_id: workspaceId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action as any,
    actor_type: "human",
    actor_id: input.actorId,
    notes: input.notes ?? null,
    metadata: {}
  } as any);
}

export async function saveBusinessProfile(repos: RepositoryBundle, body: Record<string, unknown>, actorId: string) {
  const existing = (await repos.business.profiles.listByWorkspace(workspaceId))[0] ?? null;
  const publicFields = {
    legal_business_name: String(body.legalBusinessName || body.legal_business_name || existing?.legal_business_name || existing?.legalBusinessName || "Salty Cowhide"),
    public_brand_name: String(body.publicBrandName || body.public_brand_name || existing?.public_brand_name || existing?.publicBrandName || "Salty Cowhide"),
    dba_name: body.dbaName || body.dba_name || existing?.dba_name || null,
    business_type: String(body.businessType || body.business_type || existing?.business_type || "unknown"),
    state_of_registration: body.stateOfRegistration || body.state_of_registration || existing?.state_of_registration || null,
    formation_date: body.formationDate || body.formation_date || existing?.formation_date || null,
    business_email: body.businessEmail || body.business_email || existing?.business_email || null,
    business_phone: body.businessPhone || body.business_phone || existing?.business_phone || null,
    website_url: body.websiteUrl || body.website_url || existing?.website_url || null,
    primary_domain: body.primaryDomain || body.primary_domain || existing?.primary_domain || null,
    public_address: body.publicAddress || body.public_address || existing?.public_address || null,
    registered_agent_name: body.registeredAgentName || body.registered_agent_name || existing?.registered_agent_name || null,
    sales_tax_status: String(body.salesTaxStatus || body.sales_tax_status || existing?.sales_tax_status || "unknown"),
    banking_provider_name: body.bankingProviderName || body.banking_provider_name || existing?.banking_provider_name || "novo",
    business_purpose: body.businessPurpose || body.business_purpose || existing?.business_purpose || null,
    mission_statement: body.missionStatement || body.mission_statement || existing?.mission_statement || null,
    brand_mantra: body.brandMantra || body.brand_mantra || existing?.brand_mantra || null,
    operating_principles: Array.isArray(body.operatingPrinciples) ? body.operatingPrinciples : existing?.operating_principles ?? [],
    owner_goals: Array.isArray(body.ownerGoals) ? body.ownerGoals : existing?.owner_goals ?? [],
    brand_voice: typeof body.brandVoice === "object" && body.brandVoice ? body.brandVoice : existing?.brand_voice ?? {},
    target_customers: Array.isArray(body.targetCustomers) ? body.targetCustomers : existing?.target_customers ?? [],
    key_products: Array.isArray(body.keyProducts) ? body.keyProducts : existing?.key_products ?? [],
    notes: body.notes || existing?.notes || null,
    updated_by: actorId
  };
  const profile = existing
    ? await repos.business.profiles.update(existing.id, publicFields as any)
    : await repos.business.profiles.create({ id: nowId("bizprofile"), workspace_id: workspaceId, ...publicFields, created_by: actorId } as any);
  if (typeof body.ein === "string" && body.ein.trim()) {
    await repos.business.sensitiveFields.create({
      id: nowId("sensitive"),
      workspace_id: workspaceId,
      entity_type: "business_profile",
      entity_id: profile.id,
      field_name: "ein",
      secret_ref: `business_profile/${profile.id}/ein`,
      masked_display_value: maskSensitiveValue(body.ein),
      sensitivity_level: "high_authority",
      access_policy: { authorityRequired: true }
    } as any);
    await repos.business.profiles.update(profile.id, { ein_status: "stored_sensitive", ein_secret_ref: `business_profile/${profile.id}/ein` } as any);
  }
  await createBusinessAudit(repos, { actorId, entityType: "business_profile", entityId: profile.id, action: existing ? "updated" : "created" });
  return redactBusinessSensitiveFields(profile);
}

export function businessReadiness(profile: WorkspaceRow | null) {
  const targetCustomers = profile?.target_customers ?? profile?.targetCustomers;
  const required = [
    ["Legal business name", profile?.legal_business_name || profile?.legalBusinessName],
    ["Public brand name", profile?.public_brand_name || profile?.publicBrandName],
    ["Business email", profile?.business_email || profile?.businessEmail],
    ["Website", profile?.website_url || profile?.websiteUrl],
    ["Business purpose", profile?.business_purpose || profile?.businessPurpose],
    ["Target customers", Array.isArray(targetCustomers) && targetCustomers.length > 0]
  ] as Array<[string, unknown]>;
  const complete = required.filter(([, value]) => Boolean(value)).length;
  return {
    score: Math.round((complete / required.length) * 100),
    items: required.map(([label, value]) => ({ label, status: value ? "complete" : "missing", passed: Boolean(value) }))
  };
}

export async function calculateAndPersistUnitEconomics(repos: RepositoryBundle, body: Record<string, unknown>, actorId: string) {
  const result = calculateUnitEconomics({
    salePrice: Number(body.salePrice ?? body.sale_price),
    productCost: Number(body.productCost ?? body.product_cost),
    shippingCostEstimate: Number(body.shippingCostEstimate ?? body.shipping_cost_estimate ?? 0),
    platformFeeEstimate: Number(body.platformFeeEstimate ?? body.platform_fee_estimate ?? 0),
    paymentFeeEstimate: Number(body.paymentFeeEstimate ?? body.payment_fee_estimate ?? 0),
    discountEstimate: Number(body.discountEstimate ?? body.discount_estimate ?? 0),
    adSpendAllocationEstimate: Number(body.adSpendAllocationEstimate ?? body.ad_spend_allocation_estimate ?? 0),
    minimumMarginThreshold: Number(body.minimumMarginThreshold ?? body.minimum_margin_threshold ?? 35)
  });
  const entityType = String(body.entityType || body.entity_type || "product_draft");
  const entityId = String(body.entityId || body.entity_id || "");
  if (!entityId) {
    return { ok: false as const, status: "blocked_by_guardrail", blockingReasons: ["entity_id_required"] };
  }
  const saved = await repos.business.unitEconomics.create({
    id: nowId("unit"),
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_id: entityId,
    sale_price: String(result.salePrice),
    product_cost: String(result.productCost),
    shipping_cost_estimate: String(result.shippingCostEstimate),
    platform_fee_estimate: String(result.platformFeeEstimate),
    payment_fee_estimate: String(result.paymentFeeEstimate),
    discount_estimate: String(result.discountEstimate),
    ad_spend_allocation_estimate: String(result.adSpendAllocationEstimate),
    contribution_margin: String(result.contributionMargin),
    contribution_margin_percent: String(result.contributionMarginPercent),
    break_even_cac: String(result.breakEvenCac),
    break_even_roas: result.breakEvenRoas === null ? null : String(result.breakEvenRoas),
    minimum_margin_threshold: String(result.minimumMarginThreshold),
    status: result.status,
    assumptions: { source: "owner_manual_input", blockers: result.blockers },
    created_by: actorId,
    updated_by: actorId
  } as any);
  return { ok: true as const, unitEconomics: saved, calculation: result };
}

export async function createAuthorityRequest(repos: RepositoryBundle, body: Record<string, unknown>, actorId: string) {
  const request = await repos.business.authorityRequests.create({
    id: nowId("authority"),
    workspace_id: workspaceId,
    requested_by_employee_id: body.requestedByEmployeeId || body.requested_by_employee_id || null,
    requested_by_user_id: actorId,
    authority_type: String(body.authorityType || body.authority_type || "view_sensitive_business_identity"),
    reason_needed: String(body.reasonNeeded || body.reason_needed || "Sensitive business data is required for an owner-reviewed document."),
    fields_requested: Array.isArray(body.fieldsRequested) ? body.fieldsRequested.map(String) : ["ein"],
    proposed_use: String(body.proposedUse || body.proposed_use || "Document-only use"),
    risk_level: String(body.riskLevel || body.risk_level || "high"),
    status: "pending",
    expires_at: null,
    created_by: actorId,
    updated_by: actorId
  } as any);
  await createBusinessAudit(repos, { actorId, entityType: "business_authority_request", entityId: request.id, action: "created", notes: "Sensitive authority request created." });
  return request;
}

export async function generateBusinessDocument(repos: RepositoryBundle, body: Record<string, unknown>, actorId: string) {
  const documentType = String(body.documentType || body.document_type || "one_page_business_summary");
  const sensitive = Boolean(body.requiresSensitiveData || body.requires_sensitive_data || ["w9_packet", "vendor_application_packet", "bank_verification_packet"].includes(documentType));
  const profile = await getBusinessProfile(repos);
  if (sensitive) {
    const authority = await createAuthorityRequest(repos, {
      authorityType: documentType === "business_card" ? "prepare_order_packet" : "use_ein_in_document",
      fieldsRequested: ["ein"],
      proposedUse: `${documentType} generation`
    }, actorId);
    return { ok: false as const, status: "authority_required", authority, blockingReasons: ["sensitive_authority_approval_required"] };
  }
  const document = await repos.business.documents.create({
    id: nowId("bizdoc"),
    workspace_id: workspaceId,
    document_type: documentType,
    title: String(body.title || documentType.replace(/_/g, " ")),
    status: "owner_review",
    source_data_snapshot: { profile, generatedAt: new Date().toISOString() },
    generated_file_refs: [],
    requires_sensitive_data: false,
    sensitive_fields_used: [],
    created_by_employee_id: body.createdByEmployeeId || null,
    created_by: actorId,
    updated_by: actorId
  } as any);
  await createBusinessAudit(repos, { actorId, entityType: "business_document", entityId: document.id, action: "created" });
  return { ok: true as const, document };
}

export function businessCardSvg(profile: WorkspaceRow | null, style = "polished_coastal_western") {
  const escapeXml = (value: unknown) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  const brand = escapeXml(profile?.public_brand_name ?? profile?.publicBrandName ?? "Salty Cowhide");
  const website = escapeXml(profile?.website_url ?? profile?.websiteUrl ?? "saltycowhide.com");
  const email = escapeXml(profile?.business_email ?? profile?.businessEmail ?? "hello@saltycowhide.com");
  const mantra = escapeXml(profile?.brand_mantra ?? profile?.brandMantra ?? "AI-run, human-approved POD");
  const safeStyle = escapeXml(style);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="600" viewBox="0 0 1050 600" role="img" aria-label="${brand} business card ${safeStyle}"><rect width="1050" height="600" fill="#fbf7f0"/><rect x="38" y="38" width="974" height="524" rx="28" fill="#fff" stroke="#0b7f8f" stroke-width="6"/><text x="80" y="150" fill="#0b1f33" font-family="Inter,Arial" font-size="72" font-weight="800">${brand}</text><text x="84" y="220" fill="#e5486d" font-family="Inter,Arial" font-size="34">${mantra}</text><text x="84" y="410" fill="#0b1f33" font-family="Inter,Arial" font-size="34">${email}</text><text x="84" y="462" fill="#0b7f8f" font-family="Inter,Arial" font-size="34">${website}</text><rect x="804" y="348" width="150" height="150" fill="#0b1f33"/><text x="826" y="432" fill="#fff" font-family="Inter,Arial" font-size="24">QR</text></svg>`;
}

export async function createBusinessCardPacket(repos: RepositoryBundle, body: Record<string, unknown>, actorId: string) {
  const profile = await getBusinessProfile(repos);
  const svg = businessCardSvg(profile, String(body.style || "polished_coastal_western"));
  const document = await repos.business.documents.create({
    id: nowId("bizcard"),
    workspace_id: workspaceId,
    document_type: "business_card",
    title: "Business Card",
    status: "owner_review",
    source_data_snapshot: { profile, style: body.style || "polished_coastal_western", frontSvg: svg },
    generated_file_refs: [{ type: "svg_inline_preview", status: "generated" }],
    requires_sensitive_data: false,
    sensitive_fields_used: [],
    created_by: actorId,
    updated_by: actorId
  } as any);
  const exportRow = await repos.business.documentExports.create({
    id: nowId("bizexport"),
    workspace_id: workspaceId,
    document_id: document.id,
    export_type: "svg",
    file_ref: `inline_svg:${document.id}`,
    status: "generated"
  } as any);
  return { document, export: exportRow, previewSvg: svg };
}

export async function createStaplesPacket(repos: RepositoryBundle, documentId: string, actorId: string) {
  const document = await repos.business.documents.getById(documentId, workspaceId);
  if (!document) return { ok: false as const, status: "not_found", blockingReasons: ["document_not_found"] };
  const order = await repos.business.printOrders.create({
    id: nowId("printorder"),
    workspace_id: workspaceId,
    document_id: documentId,
    vendor: "staples",
    status: "owner_handoff_required",
    print_specs: { size: "3.5x2in", bleed: "0.125in", targetDpi: 300 },
    handoff_instructions: "Upload the exported SVG/PDF/PNG packet to Staples business card printing. SaltyFactory has not placed an order.",
    created_by: actorId,
    updated_by: actorId
  } as any);
  return { ok: true as const, order };
}

export function providerBoundaryStatus(provider: "plaid" | "novo") {
  if (provider === "novo") {
    return {
      ok: false,
      status: "not_configured",
      provider: "novo",
      setupRequired: ["Use Plaid/open-banking when configured or manual CSV import.", "Do not store Novo login credentials."],
      blockingReasons: ["novo_direct_api_not_verified"]
    };
  }
  return {
    ok: false,
    status: "not_configured",
    provider: "plaid",
    setupRequired: ["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV", "PLAID_PRODUCTS=transactions"],
    blockingReasons: ["plaid_not_configured"]
  };
}

export function json(data: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export { calculateProductMarketingReadiness };
