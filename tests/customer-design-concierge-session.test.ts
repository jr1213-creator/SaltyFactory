import { describe, expect, it } from "vitest";
import {
  CUSTOMER_DESIGN_SESSION_EXPIRED,
  CUSTOMER_DESIGN_SESSION_INVALID,
  CUSTOMER_DESIGN_SESSION_TERMINAL,
  createCustomerDesignSession,
  generateCustomerDesignCandidates,
  getCustomerDesignSessionDetail,
  handleCustomerDesignMessage,
  recordCustomerDesignApproval,
  requestCustomerSpecificProductCreation
} from "@saltyfactory/ai-free";
import { createCustomerDesignRepos, customerDesignWorkspaceId } from "./customer-design-test-helpers";

describe("customer design concierge sessions", () => {
  it("creates a session, saves messages, extracts requirements, and asks only needed clarification", async () => {
    const repos = createCustomerDesignRepos();
    const session = await createCustomerDesignSession({ repos, workspaceId: customerDesignWorkspaceId, sourceRoute: "/store/custom" });
    const output = await handleCustomerDesignMessage({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken,
      messageText: "I want something for my dad's fishing trip"
    });

    expect(output.customerMessage.message_text).toContain("dad");
    expect(output.requirement.session_id).toBe(session.session.id);
    expect(output.readyForCandidates).toBe(false);
    expect(output.conciergeMessage.message_text).toContain("product");
  });

  it("requires the session token and prevents cross-session access", async () => {
    const repos = createCustomerDesignRepos();
    const first = await createCustomerDesignSession({ repos, workspaceId: customerDesignWorkspaceId });
    const second = await createCustomerDesignSession({ repos, workspaceId: customerDesignWorkspaceId });

    await expect(getCustomerDesignSessionDetail({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: first.session.id,
      sessionToken: second.sessionToken
    })).rejects.toThrow(CUSTOMER_DESIGN_SESSION_INVALID);

    const detail = await getCustomerDesignSessionDetail({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: first.session.id,
      sessionToken: first.sessionToken
    });
    expect(JSON.stringify(detail)).not.toContain("session_token_hash");
    expect(detail.messages.length).toBeGreaterThan(0);
  });

  it("rejects expired sessions for reads, messages, generation, approval, and publish requests", async () => {
    const repos = createCustomerDesignRepos();
    const created = await createCustomerDesignSession({ repos, workspaceId: customerDesignWorkspaceId });
    await repos.customerDesign.sessions.update(created.session.id, { expires_at: new Date(Date.now() - 1000).toISOString() });

    await expect(getCustomerDesignSessionDetail({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: created.session.id,
      sessionToken: created.sessionToken
    })).rejects.toThrow(CUSTOMER_DESIGN_SESSION_EXPIRED);

    await expect(handleCustomerDesignMessage({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: created.session.id,
      sessionToken: created.sessionToken,
      messageText: "I want a funny redfish shirt"
    })).rejects.toThrow(CUSTOMER_DESIGN_SESSION_EXPIRED);

    await expect(generateCustomerDesignCandidates({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: created.session.id,
      sessionToken: created.sessionToken
    })).rejects.toThrow(CUSTOMER_DESIGN_SESSION_EXPIRED);

    await expect(recordCustomerDesignApproval({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: created.session.id,
      sessionToken: created.sessionToken,
      candidateId: "missing"
    })).rejects.toThrow(CUSTOMER_DESIGN_SESSION_EXPIRED);

    await expect(requestCustomerSpecificProductCreation({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: created.session.id,
      sessionToken: created.sessionToken,
      candidateId: "missing"
    })).rejects.toThrow(CUSTOMER_DESIGN_SESSION_EXPIRED);
  });

  it("rejects terminal sessions for customer mutations", async () => {
    const repos = createCustomerDesignRepos();
    const created = await createCustomerDesignSession({ repos, workspaceId: customerDesignWorkspaceId });
    await repos.customerDesign.sessions.update(created.session.id, { status: "blocked" });

    await expect(handleCustomerDesignMessage({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: created.session.id,
      sessionToken: created.sessionToken,
      messageText: "I want a funny redfish shirt"
    })).rejects.toThrow(CUSTOMER_DESIGN_SESSION_TERMINAL);
  });
});
