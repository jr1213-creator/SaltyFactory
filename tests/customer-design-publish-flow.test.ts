import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CUSTOMER_DESIGN_CANDIDATE_BLOCKED,
  CUSTOMER_DESIGN_RATE_LIMITED,
  attachPreviewAssetToCandidate,
  getCustomerPurchaseLinkDetail,
  recordCustomerDesignApproval,
  requestCustomerSpecificProductCreation
} from "@saltyfactory/ai-free";
import { createCustomerDesignRepos, createSafeSessionWithCandidates, customerDesignWorkspaceId } from "./customer-design-test-helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

function enableTestProductCreate() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("CUSTOMER_CONCIERGE_AUTO_PUBLISH_ENABLED", "true");
  vi.stubEnv("CUSTOMER_CONCIERGE_ALLOW_SHOPIFY_PRODUCT_CREATE", "true");
  vi.stubEnv("CUSTOMER_CONCIERGE_SHOPIFY_PRODUCT_CREATE_MODE", "test_adapter");
  vi.stubEnv("CUSTOMER_CONCIERGE_DEFAULT_PRICE", "30.00");
  vi.stubEnv("CUSTOMER_CONCIERGE_DEFAULT_COGS", "8.00");
  vi.stubEnv("CUSTOMER_CONCIERGE_DEFAULT_SHIPPING_COST", "4.00");
  vi.stubEnv("CUSTOMER_CONCIERGE_DEFAULT_PAYMENT_FEE", "1.20");
  vi.stubEnv("CUSTOMER_CONCIERGE_DEFAULT_PLATFORM_FEE", "0.90");
}

describe("customer design controlled product creation", () => {
  it("blocks product creation by default env flags and without customer approval", async () => {
    const repos = createCustomerDesignRepos();
    const { session, sessionToken, candidate } = await createSafeSessionWithCandidates(repos);

    const defaultWithoutApproval = await requestCustomerSpecificProductCreation({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.id,
      sessionToken,
      candidateId: candidate.id
    });
    expect(defaultWithoutApproval.ok).toBe(false);
    if (defaultWithoutApproval.ok) throw new Error("expected default without approval to block");
    expect(defaultWithoutApproval.blockingReason).toBe("customer_approval_required");

    const approvedSession = await createSafeSessionWithCandidates(repos);
    await recordCustomerDesignApproval({ repos, workspaceId: customerDesignWorkspaceId, sessionId: approvedSession.session.id, sessionToken: approvedSession.sessionToken, candidateId: approvedSession.candidate.id });
    const defaultFlagsBlocked = await requestCustomerSpecificProductCreation({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: approvedSession.session.id,
      sessionToken: approvedSession.sessionToken,
      candidateId: approvedSession.candidate.id
    });
    expect(defaultFlagsBlocked.ok).toBe(false);
    if (defaultFlagsBlocked.ok) throw new Error("expected default flags to block");
    expect(defaultFlagsBlocked.blockingReason).toBe("customer_concierge_auto_publish_disabled");

    enableTestProductCreate();
    const noApprovalRepos = createCustomerDesignRepos();
    const noApproval = await createSafeSessionWithCandidates(noApprovalRepos);
    const blocked = await requestCustomerSpecificProductCreation({
      repos: noApprovalRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: noApproval.session.id,
      sessionToken: noApproval.sessionToken,
      candidateId: noApproval.candidate.id
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("expected missing approval to block");
    expect(blocked.blockingReason).toBe("customer_approval_required");
  });

  it("blocks if preview QA is missing and succeeds with test adapter only after all gates pass", async () => {
    enableTestProductCreate();
    const repos = createCustomerDesignRepos();
    const { session, sessionToken, candidate } = await createSafeSessionWithCandidates(repos);
    await recordCustomerDesignApproval({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.id,
      sessionToken,
      candidateId: candidate.id,
      eventType: "approved_for_purchase_product"
    });

    const missingPreview = await requestCustomerSpecificProductCreation({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.id,
      sessionToken,
      candidateId: candidate.id
    });
    expect(missingPreview.ok).toBe(false);
    if (missingPreview.ok) throw new Error("expected missing preview to block");
    expect(missingPreview.blockingReason).toBe("preview_qa_required");

    const successSession = await createSafeSessionWithCandidates(repos);
    await recordCustomerDesignApproval({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: successSession.session.id,
      sessionToken: successSession.sessionToken,
      candidateId: successSession.candidate.id,
      eventType: "approved_for_purchase_product"
    });
    await attachPreviewAssetToCandidate({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: successSession.session.id,
      sessionToken: successSession.sessionToken,
      candidateId: successSession.candidate.id,
      mode: "fixture"
    });
    const created = await requestCustomerSpecificProductCreation({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: successSession.session.id,
      sessionToken: successSession.sessionToken,
      candidateId: successSession.candidate.id
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.shopifyProductCreateMode).toBe("test_adapter");
      expect(created.purchaseUrlMode).toBe("test_adapter_product_page");
      expect(created.purchaseUrl).toContain("/store/custom/purchase/");
      expect(created.purchaseUrl).toContain("accessToken=");
      expect(created.customerSpecificProduct.promoted_to_public).toBe(false);
      expect(created.safetyChecks.publicCatalogPromoted).toBe(false);

      const url = new URL(`http://localhost:3000${created.purchaseUrl}`);
      await expect(getCustomerPurchaseLinkDetail({
        repos,
        workspaceId: customerDesignWorkspaceId,
        handle: url.pathname.split("/").at(-1)!,
        accessToken: "wrong"
      })).rejects.toThrow();
      const detail = await getCustomerPurchaseLinkDetail({
        repos,
        workspaceId: customerDesignWorkspaceId,
        handle: url.pathname.split("/").at(-1)!,
        accessToken: url.searchParams.get("accessToken")!
      });
      expect(detail.job.purchaseUrlMode).toBe("test_adapter_product_page");
    }
  });

  it("blocks failed or flagged policy reviews before product creation", async () => {
    enableTestProductCreate();
    const repos = createCustomerDesignRepos();
    const { session, sessionToken, candidate } = await createSafeSessionWithCandidates(repos);
    await recordCustomerDesignApproval({ repos, workspaceId: customerDesignWorkspaceId, sessionId: session.id, sessionToken, candidateId: candidate.id });
    await attachPreviewAssetToCandidate({ repos, workspaceId: customerDesignWorkspaceId, sessionId: session.id, sessionToken, candidateId: candidate.id, mode: "fixture" });
    await repos.marketing.policyReviewResults.update(String(candidate.policy_review_id), {
      risk_level: "medium",
      blocked: false,
      flagged_terms: [{ rule_id: "unsupported_claim", term: "waterproof" }]
    });

    const blocked = await requestCustomerSpecificProductCreation({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.id,
      sessionToken,
      candidateId: candidate.id
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("expected flagged policy to block");
    expect(blocked.blockingReason).toBe("policy_review_failed_or_flagged");
  });

  it("blocks product creation when explicit economics are missing or below margin floor", async () => {
    enableTestProductCreate();
    vi.stubEnv("CUSTOMER_CONCIERGE_DEFAULT_COGS", "");
    const missingRepos = createCustomerDesignRepos();
    const missing = await createSafeSessionWithCandidates(missingRepos);
    await recordCustomerDesignApproval({ repos: missingRepos, workspaceId: customerDesignWorkspaceId, sessionId: missing.session.id, sessionToken: missing.sessionToken, candidateId: missing.candidate.id });
    await attachPreviewAssetToCandidate({ repos: missingRepos, workspaceId: customerDesignWorkspaceId, sessionId: missing.session.id, sessionToken: missing.sessionToken, candidateId: missing.candidate.id, mode: "fixture" });
    const missingResult = await requestCustomerSpecificProductCreation({
      repos: missingRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: missing.session.id,
      sessionToken: missing.sessionToken,
      candidateId: missing.candidate.id
    });
    expect(missingResult.ok).toBe(false);
    if (!missingResult.ok) expect(missingResult.blockingReason).toBe("customer_design_margin_data_missing");

    enableTestProductCreate();
    vi.stubEnv("CUSTOMER_CONCIERGE_DEFAULT_PRICE", "12.00");
    const lowRepos = createCustomerDesignRepos();
    const low = await createSafeSessionWithCandidates(lowRepos);
    await recordCustomerDesignApproval({ repos: lowRepos, workspaceId: customerDesignWorkspaceId, sessionId: low.session.id, sessionToken: low.sessionToken, candidateId: low.candidate.id });
    await attachPreviewAssetToCandidate({ repos: lowRepos, workspaceId: customerDesignWorkspaceId, sessionId: low.session.id, sessionToken: low.sessionToken, candidateId: low.candidate.id, mode: "fixture" });
    const lowResult = await requestCustomerSpecificProductCreation({
      repos: lowRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: low.session.id,
      sessionToken: low.sessionToken,
      candidateId: low.candidate.id
    });
    expect(lowResult.ok).toBe(false);
    if (!lowResult.ok) expect(lowResult.blockingReason).toBe("deterministic_gate_failed");
  });

  it("does not approve blocked candidates and honors requested allowed product type", async () => {
    enableTestProductCreate();
    const blockedRepos = createCustomerDesignRepos();
    const blockedSession = await createSafeSessionWithCandidates(blockedRepos);
    await blockedRepos.customerDesign.candidates.update(blockedSession.candidate.id, { status: "blocked" });
    await expect(recordCustomerDesignApproval({
      repos: blockedRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: blockedSession.session.id,
      sessionToken: blockedSession.sessionToken,
      candidateId: blockedSession.candidate.id
    })).rejects.toThrow(CUSTOMER_DESIGN_CANDIDATE_BLOCKED);

    const hoodieRepos = createCustomerDesignRepos();
    const {
      createCustomerDesignSession,
      handleCustomerDesignMessage,
      generateCustomerDesignCandidates
    } = await import("@saltyfactory/ai-free");
    const hoodieSession = await createCustomerDesignSession({ repos: hoodieRepos, workspaceId: customerDesignWorkspaceId });
    await handleCustomerDesignMessage({
      repos: hoodieRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: hoodieSession.session.id,
      sessionToken: hoodieSession.sessionToken,
      messageText: "I want a funny redfish hoodie for a Tampa Bay fishing trip"
    });
    const generated = await generateCustomerDesignCandidates({ repos: hoodieRepos, workspaceId: customerDesignWorkspaceId, sessionId: hoodieSession.session.id, sessionToken: hoodieSession.sessionToken });
    const candidate = generated.candidates.find((row) => row.status === "shown_to_customer")!;
    await recordCustomerDesignApproval({ repos: hoodieRepos, workspaceId: customerDesignWorkspaceId, sessionId: hoodieSession.session.id, sessionToken: hoodieSession.sessionToken, candidateId: candidate.id });
    await attachPreviewAssetToCandidate({ repos: hoodieRepos, workspaceId: customerDesignWorkspaceId, sessionId: hoodieSession.session.id, sessionToken: hoodieSession.sessionToken, candidateId: candidate.id, mode: "fixture" });
    const created = await requestCustomerSpecificProductCreation({ repos: hoodieRepos, workspaceId: customerDesignWorkspaceId, sessionId: hoodieSession.session.id, sessionToken: hoodieSession.sessionToken, candidateId: candidate.id });
    expect(created.ok).toBe(true);
    const drafts = await hoodieRepos.draft.listByWorkspace(customerDesignWorkspaceId);
    expect(drafts.at(-1)?.product_type).toBe("hoodie");
  });

  it("does not mark rejected or edit-requested candidates as approved", async () => {
    const repos = createCustomerDesignRepos();
    const rejected = await createSafeSessionWithCandidates(repos);
    await recordCustomerDesignApproval({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: rejected.session.id,
      sessionToken: rejected.sessionToken,
      candidateId: rejected.candidate.id,
      eventType: "rejected"
    });
    expect((await repos.customerDesign.sessions.getById(rejected.session.id, customerDesignWorkspaceId))?.status).not.toBe("approved_candidate");

    const edit = await createSafeSessionWithCandidates(repos);
    await recordCustomerDesignApproval({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: edit.session.id,
      sessionToken: edit.sessionToken,
      candidateId: edit.candidate.id,
      eventType: "requested_edit"
    });
    expect((await repos.customerDesign.sessions.getById(edit.session.id, customerDesignWorkspaceId))?.status).not.toBe("approved_candidate");
  });

  it("enforces generation and publish request limits per session", async () => {
    vi.stubEnv("CUSTOMER_CONCIERGE_MAX_GENERATIONS_PER_SESSION", "1");
    const {
      createCustomerDesignSession,
      handleCustomerDesignMessage,
      generateCustomerDesignCandidates
    } = await import("@saltyfactory/ai-free");
    const generationRepos = createCustomerDesignRepos();
    const session = await createCustomerDesignSession({ repos: generationRepos, workspaceId: customerDesignWorkspaceId });
    await handleCustomerDesignMessage({
      repos: generationRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken,
      messageText: "I want a funny redfish shirt for Tampa Bay"
    });
    await generateCustomerDesignCandidates({ repos: generationRepos, workspaceId: customerDesignWorkspaceId, sessionId: session.session.id, sessionToken: session.sessionToken });
    await expect(generateCustomerDesignCandidates({
      repos: generationRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken
    })).rejects.toThrow(CUSTOMER_DESIGN_RATE_LIMITED);

    vi.stubEnv("CUSTOMER_CONCIERGE_MAX_PUBLISH_REQUESTS_PER_SESSION", "1");
    const publishRepos = createCustomerDesignRepos();
    const publish = await createSafeSessionWithCandidates(publishRepos);
    await recordCustomerDesignApproval({ repos: publishRepos, workspaceId: customerDesignWorkspaceId, sessionId: publish.session.id, sessionToken: publish.sessionToken, candidateId: publish.candidate.id });
    const first = await requestCustomerSpecificProductCreation({
      repos: publishRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: publish.session.id,
      sessionToken: publish.sessionToken,
      candidateId: publish.candidate.id
    });
    expect(first.ok).toBe(false);
    await publishRepos.customerDesign.sessions.update(publish.session.id, { status: "active" });
    await expect(requestCustomerSpecificProductCreation({
      repos: publishRepos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: publish.session.id,
      sessionToken: publish.sessionToken,
      candidateId: publish.candidate.id
    })).rejects.toThrow(CUSTOMER_DESIGN_RATE_LIMITED);
  });
});
