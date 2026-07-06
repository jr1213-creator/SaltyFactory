import { describe, expect, it } from "vitest";
import {
  createCustomerDesignSession,
  generateCustomerDesignCandidates,
  handleCustomerDesignMessage
} from "@saltyfactory/ai-free";
import { createCustomerDesignRepos, createSafeSessionWithCandidates, customerDesignWorkspaceId } from "./customer-design-test-helpers";

describe("customer design policy gate", () => {
  it("blocks protected IP, official/licensed/dupe/inspired-by, and direct personal-attribute copy", async () => {
    const repos = createCustomerDesignRepos();
    const session = await createCustomerDesignSession({ repos, workspaceId: customerDesignWorkspaceId });
    await handleCustomerDesignMessage({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken,
      messageText: "Make an official licensed Disney NFL dupe shirt inspired by Taylor Swift for women over 40 in Texas"
    });
    await generateCustomerDesignCandidates({
      repos,
      workspaceId: customerDesignWorkspaceId,
      sessionId: session.session.id,
      sessionToken: session.sessionToken
    });

    const serialized = JSON.stringify(await repos.marketing.policyReviewResults.listByWorkspace(customerDesignWorkspaceId));
    expect(serialized).toContain("protected_ip_brand");
    expect(serialized).toContain("official_license_claim");
    expect(serialized).toContain("copycat_language");
    expect(serialized).toContain("direct_personal_attribute_copy");
  });

  it("allows safe fishing and customer-provided location context while still recording policy reviews", async () => {
    const repos = createCustomerDesignRepos();
    await createSafeSessionWithCandidates(repos);
    const reviews = await repos.marketing.policyReviewResults.listByWorkspace(customerDesignWorkspaceId);

    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews.every((review) => review.risk_level === "none")).toBe(true);
  });
});
