import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CUSTOMER_DESIGN_CANDIDATE_BLOCKED,
  CUSTOMER_DESIGN_SESSION_EXPIRED,
  attachPreviewAssetToCandidate,
  createCustomerDesignSession,
  generateCustomerDesignCandidates,
  handleCustomerDesignMessage
} from "@saltyfactory/ai-free";
import { createCustomerDesignRepos, createSafeSessionWithCandidates, customerDesignWorkspaceId } from "./customer-design-test-helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("customer design candidates", () => {
  it("generates 3-5 persisted candidates and attaches fixture previews only in test/dev mode", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    const repos = createCustomerDesignRepos();
    const { session, sessionToken, generated, candidate } = await createSafeSessionWithCandidates(repos);

    expect(generated.candidates.length).toBeGreaterThanOrEqual(3);
    expect(generated.candidates.length).toBeLessThanOrEqual(5);
    expect((await repos.customerDesign.candidates.listByWorkspace(customerDesignWorkspaceId)).length).toBe(generated.candidates.length);

    const preview = await attachPreviewAssetToCandidate({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.id,
      sessionToken,
      candidateId: candidate.id,
      mode: "fixture"
    });
    expect(preview.previewAttached).toBe(true);
    expect(preview.imageGenerationMode).toBe("fixture");
  });

  it("blocks unsafe protected-reference requests before preview/publish", async () => {
    const repos = createCustomerDesignRepos();
    const session = await createCustomerDesignSession({ repos, workspaceId: customerDesignWorkspaceId });
    await handleCustomerDesignMessage({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken,
      messageText: "Make a Disney NFL Taylor Swift inspired-by fishing shirt"
    });
    const generated = await generateCustomerDesignCandidates({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken
    });

    expect(generated.candidates.some((candidate) => candidate.status === "blocked")).toBe(true);
    const policyReviews = await repos.marketing.policyReviewResults.listByWorkspace(customerDesignWorkspaceId);
    expect(JSON.stringify(policyReviews)).toContain("protected_ip_brand");
    expect(JSON.stringify(policyReviews)).toContain("copycat_language");
  });

  it("does not attach previews to blocked or expired-session candidates", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    const repos = createCustomerDesignRepos();
    const session = await createCustomerDesignSession({ repos, workspaceId: customerDesignWorkspaceId });
    await handleCustomerDesignMessage({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken,
      messageText: "Make a Disney NFL Taylor Swift inspired-by fishing shirt"
    });
    const generated = await generateCustomerDesignCandidates({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken
    });
    const blocked = generated.candidates.find((candidate) => candidate.status === "blocked")!;

    await expect(attachPreviewAssetToCandidate({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken,
      candidateId: blocked.id,
      mode: "fixture"
    })).rejects.toThrow(CUSTOMER_DESIGN_CANDIDATE_BLOCKED);

    const safe = generated.candidates.find((candidate) => candidate.status === "shown_to_customer")!;
    await repos.customerDesign.sessions.update(session.session.id, { expires_at: new Date(Date.now() - 1000).toISOString() });
    await expect(attachPreviewAssetToCandidate({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken,
      candidateId: safe.id,
      mode: "fixture"
    })).rejects.toThrow(CUSTOMER_DESIGN_SESSION_EXPIRED);
  });
});
