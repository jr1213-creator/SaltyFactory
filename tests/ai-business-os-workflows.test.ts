import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import {
  calculateProductMarketingReadiness,
  calculateUnitEconomics,
  globalForbiddenAiEmployeeActions
} from "@saltyfactory/domain";
import {
  createEmployeeFromApprovedRequest,
  createHireRequest,
  workspaceId as aiWorkspaceId
} from "../apps/studio/app/api/studio/ai-employees/hiring/_shared";
import {
  convertSuggestionToHireRequest,
  convertSuggestionToTask,
  createCapabilityRequest,
  createImprovementSuggestion,
  repeatedBlockerSuggestion
} from "../apps/studio/app/api/studio/ai-employees/improvements/_shared";
import {
  businessReadiness,
  calculateAndPersistUnitEconomics,
  createAuthorityRequest,
  createBusinessCardPacket,
  createStaplesPacket,
  generateBusinessDocument,
  providerBoundaryStatus,
  saveBusinessProfile,
  workspaceId as businessWorkspaceId
} from "../apps/studio/app/api/studio/business/_shared";

const root = process.cwd();

describe("f28066e provider workflow verification hardening", () => {
  it("keeps Printify and Shopify provider routes reachable from Studio UI buttons", () => {
    const source = readFileSync(join(root, "apps/studio/app/studio/publish/ProviderPublishActionsClient.tsx"), "utf8");
    expect(source).toContain("Send to Printify");
    expect(source).toContain("Create Shopify Draft");
    expect(source).toContain("/api/studio/publish/printify");
    expect(source).toContain("/api/studio/publish/shopify");
  });

  it("requires a real Shopify collection ID before draft creation and readiness", () => {
    const route = readFileSync(join(root, "apps/studio/app/api/studio/publish/shopify/route.ts"), "utf8");
    const readiness = readFileSync(join(root, "apps/studio/app/api/studio/publish-reviews/_readiness.ts"), "utf8");
    expect(route).toContain("shopify_collection_id_required");
    expect(route).toContain("assignCollection(shopifyProductId, collectionId)");
    expect(readiness).toContain("shopify_collection_id_or_connection_missing");
    expect(readiness).toContain("shopify_collection_id");
  });
});

describe("AI Hiring Desk workflow", () => {
  it("creates a full hire request, approval, role spec, employee definition, scopes, and audit events", async () => {
    const repos = createMemoryRepositories();
    const actorId = "user_owner";
    const created = await createHireRequest({
      requestedRoleTitle: "Printify Catalog & Variant Specialist",
      department: "POD Operations",
      detectedGap: "variant_mapping_blocker",
      reasonNeeded: "Need safer Printify variant handoffs.",
      allowedActions: ["draft", "recommend", "publish"]
    }, actorId, repos as any);

    expect(created.request.workspace_id).toBe(aiWorkspaceId);
    expect(created.spec.forbidden_actions).toEqual(expect.arrayContaining([...globalForbiddenAiEmployeeActions]));
    expect(created.spec.allowed_actions).not.toContain("publish");
    expect((await repos.shared.approvals.listByWorkspace(aiWorkspaceId))).toHaveLength(1);

    const blocked = await createEmployeeFromApprovedRequest(repos as any, created.request.id, actorId);
    expect(blocked.ok).toBe(false);
    expect(blocked.blockingReasons).toContain("hire_request_approval_required");

    await repos.aiWorkforce.hireRequests.update(created.request.id, { status: "approved" } as any);
    const employee = await createEmployeeFromApprovedRequest(repos as any, created.request.id, actorId);
    expect(employee.ok).toBe(true);
    const employeeResult = employee as Extract<typeof employee, { ok: true }>;
    expect(employeeResult.employee.forbidden_actions).toEqual(expect.arrayContaining(["publish", "send", "spend", "sync"]));
    expect(employeeResult.scopes.some((scope: any) => scope.permission_level === "provider_action_blocked")).toBe(true);
    expect(await repos.aiEmployee.listByWorkspace(aiWorkspaceId)).toHaveLength(1);
    expect((await repos.audit.listByWorkspace(aiWorkspaceId)).some((event: any) => event.entity_type === "ai_employee_definition")).toBe(true);
  });
});

describe("AI Continuous Improvement workflow", () => {
  it("creates suggestions, repeated blocker triggers, task conversion, hire conversion, and safe capability requests", async () => {
    const repos = createMemoryRepositories();
    const actorId = "user_owner";
    const suggestion = await createImprovementSuggestion({
      title: "Missing provider method",
      suggestionType: "provider_integration_request",
      observedProblem: "Shopify media lookup is incomplete.",
      affectedWorkflow: "Shopify draft workflow",
      currentBehavior: "Owner cannot verify media after draft creation.",
      proposedImprovement: "Add an owner-reviewed provider integration request.",
      businessValue: "Improves launch confidence."
    }, actorId, repos as any);
    expect(suggestion.suggestion.status).toBe("submitted");
    const approvals = await repos.shared.approvals.listByWorkspace(aiWorkspaceId);
    expect(approvals).toHaveLength(1);
    expect(approvals[0]!.approval_type).toBe("ai_improvement");

    const triggered = await repeatedBlockerSuggestion({ blocker: "missing_collection_id", count: 3, affectedWorkflow: "Publish Review", actorId, repos: repos as any });
    expect((triggered?.suggestion as any)?.title).toContain("missing_collection_id");

    const task = await convertSuggestionToTask(repos as any, suggestion.suggestion.id, actorId);
    expect(task.ok).toBe(true);
    const tasks = await repos.shared.tasks.listByWorkspace(aiWorkspaceId);
    expect(tasks[0]!.entity_type).toBe("ai_improvement_suggestion");

    const hire = await convertSuggestionToHireRequest(repos as any, triggered!.suggestion.id, actorId);
    expect(hire.ok).toBe(true);
    expect((await repos.aiWorkforce.hireRequests.listByWorkspace(aiWorkspaceId)).length).toBeGreaterThan(0);

    const capability = await createCapabilityRequest({
      employeeId: "employee_1",
      capabilityName: "Internal diagnosis",
      requestedPermissionLevel: "provider_action_requested",
      requestedActions: ["publish"]
    }, actorId, repos as any);
    expect(capability.request.risk_level).toBe("high");
    expect(capability.request.forbidden_actions).toEqual(expect.arrayContaining(["publish", "send", "spend"]));
  });
});

describe("Business Command Center workflows", () => {
  it("persists profile, masks sensitive fields, calculates readiness, unit economics, and paid readiness", async () => {
    const repos = createMemoryRepositories();
    const profile = await saveBusinessProfile(repos as any, {
      legalBusinessName: "Salty Cowhide LLC",
      publicBrandName: "Salty Cowhide",
      businessEmail: "hello@saltycowhide.com",
      websiteUrl: "https://saltycowhide.com",
      businessPurpose: "AI-run, human-approved POD products.",
      targetCustomers: ["western coastal shoppers"],
      ein: "12-3456789"
    }, "user_owner");
    expect(JSON.stringify(profile)).not.toContain("12-3456789");
    expect(JSON.stringify(profile)).not.toContain("ein_secret_ref");
    const sensitive = await repos.business.sensitiveFields.listByWorkspace(businessWorkspaceId);
    expect(sensitive[0]!.masked_display_value).toBe("*****6789");
    expect(businessReadiness(profile).score).toBeGreaterThanOrEqual(80);

    const missing = calculateUnitEconomics({ salePrice: 32 });
    expect(missing.status).toBe("unknown");
    expect(missing.blockers).toContain("product_cost_required");

    const unit = await calculateAndPersistUnitEconomics(repos as any, {
      entityType: "product_draft",
      entityId: "draft_margin_bad",
      salePrice: 20,
      productCost: 22,
      minimumMarginThreshold: 35
    }, "user_owner");
    expect(unit.ok).toBe(true);
    expect((unit as Extract<typeof unit, { ok: true }>).unitEconomics.status).toBe("blocked");
    expect(calculateProductMarketingReadiness({ unitEconomicsStatus: "blocked", channel: "meta_ads" }).readiness).toBe("blocked");
  });

  it("guards sensitive documents, persists authority, business card packets, and Staples handoff without orders", async () => {
    const repos = createMemoryRepositories();
    await saveBusinessProfile(repos as any, {
      legalBusinessName: "Salty Cowhide LLC",
      publicBrandName: "Salty Cowhide",
      businessEmail: "hello@saltycowhide.com",
      websiteUrl: "https://saltycowhide.com"
    }, "user_owner");
    const sensitiveDoc = await generateBusinessDocument(repos as any, { documentType: "w9_packet" }, "user_owner");
    expect(sensitiveDoc.ok).toBe(false);
    expect(sensitiveDoc.status).toBe("authority_required");
    expect(await repos.business.authorityRequests.listByWorkspace(businessWorkspaceId)).toHaveLength(1);

    const authority = await createAuthorityRequest(repos as any, { authorityType: "access_bank_summary", fieldsRequested: ["masked_balance"] }, "user_owner");
    expect(authority.status).toBe("pending");

    const card = await createBusinessCardPacket(repos as any, { style: "polished_coastal_western" }, "user_owner");
    expect(card.previewSvg).toContain("<svg");
    expect(card.export.file_ref).toContain("inline_svg:");

    const packet = await createStaplesPacket(repos as any, card.document.id, "user_owner");
    expect(packet.ok).toBe(true);
    const packetResult = packet as Extract<typeof packet, { ok: true }>;
    expect(packetResult.order.status).toBe("owner_handoff_required");
    expect(packetResult.order.handoff_instructions).toContain("has not placed an order");
  });

  it("blocks unconfigured banking providers and has no money movement routes", () => {
    expect(providerBoundaryStatus("novo").blockingReasons).toContain("novo_direct_api_not_verified");
    expect(providerBoundaryStatus("plaid").setupRequired).toContain("PLAID_SECRET");
    expect(existsSync(join(root, "apps/studio/app/api/studio/business/banking/transfer"))).toBe(false);
    expect(existsSync(join(root, "apps/studio/app/api/studio/business/banking/payments"))).toBe(false);
    expect(existsSync(join(root, "apps/studio/app/api/studio/business/banking/wires"))).toBe(false);
  });
});

describe("AI and business UI wiring", () => {
  it("exposes real Studio navigation and backend callers for AI workforce and business OS", () => {
    const nav = readFileSync(join(root, "apps/studio/app/studio/StudioNavigation.tsx"), "utf8");
    expect(nav).toContain("/studio/ai-employees/hiring");
    expect(nav).toContain("/studio/ai-employees/improvements");
    expect(nav).toContain("/studio/business");
    expect(nav).toContain("/studio/business/banking");
    expect(nav).toContain("/studio/business/print-studio");

    const hiringPage = readFileSync(join(root, "apps/studio/app/studio/ai-employees/hiring/page.tsx"), "utf8");
    const businessPage = readFileSync(join(root, "apps/studio/app/studio/business/page.tsx"), "utf8");
    const financialsPage = readFileSync(join(root, "apps/studio/app/studio/business/financials/page.tsx"), "utf8");
    expect(hiringPage).toContain("/api/studio/ai-employees/hiring/propose");
    expect(businessPage).toContain("/api/studio/business/make-me-look-legit");
    expect(financialsPage).toContain("/api/studio/business/unit-economics/calculate");
  });
});
