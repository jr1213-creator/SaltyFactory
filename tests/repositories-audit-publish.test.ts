import { describe, expect, it } from "vitest";
import { createRepositories } from "@saltyfactory/db";
import { allTrueGates, validDomainFixtures, workspaceA } from "./helpers";

describe("repositories audit and publish", () => {
  it("audit event write helper works", async () => {
    const repos = createRepositories();
    await repos.audit.write({ ...validDomainFixtures.auditEvent, workspace_id: workspaceA });
    expect(await repos.audit.listByWorkspace(workspaceA)).toHaveLength(1);
  });

  it("repository create can write audit events", async () => {
    const repos = createRepositories();
    await repos.draft.create({ id: "draft_a", workspace_id: workspaceA }, { id: "audit_a", workspace_id: workspaceA, entity_type: "product_draft", entity_id: "draft_a", action: "created", actor_type: "human", actor_id: "user_01", created_at: validDomainFixtures.auditEvent.created_at });
    expect(await repos.audit.listByWorkspace(workspaceA)).toHaveLength(1);
  });

  it("publish review repository preserves gates", async () => {
    const repos = createRepositories();
    await repos.publish.create({ ...validDomainFixtures.publishReview, id: "pubrev_a", workspace_id: workspaceA });
    const updated = await repos.publish.markReviewed("pubrev_a", "user_01", allTrueGates, ["ok"]);
    expect(updated.gates).toEqual(allTrueGates);
    expect(updated.shopify_publish_allowed).toBe(true);
    expect(updated.printify_sync_allowed).toBe(true);
  });

  it("requires audit actor for publish review actions", async () => {
    const repos = createRepositories();
    await repos.publish.create({ ...validDomainFixtures.publishReview, id: "pubrev_a", workspace_id: workspaceA });
    await expect(repos.publish.markReviewed("pubrev_a", "", allTrueGates)).rejects.toThrow("audit_actor_required");
  });
});
