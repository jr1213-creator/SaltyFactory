import { describe, expect, it } from "vitest";
import { createRepositories } from "@saltyfactory/db";
import { workspaceA, workspaceB } from "./helpers";

describe("repositories crud", () => {
  it("creates, lists, gets, and updates by workspace", async () => {
    const repos = createRepositories();
    await repos.trend.create({ id: "tsig_a", workspace_id: workspaceA, status: "new", keyword: "coastal" });
    await repos.trend.create({ id: "tsig_b", workspace_id: workspaceB, status: "new", keyword: "desert" });
    expect(await repos.trend.getById("tsig_a", workspaceA)).toMatchObject({ keyword: "coastal" });
    expect(await repos.trend.getById("tsig_b", workspaceA)).toBeNull();
    expect(await repos.trend.listByWorkspace(workspaceA)).toHaveLength(1);
    expect(await repos.trend.update("tsig_a", { status: "reviewed" })).toMatchObject({ status: "reviewed" });
  });

  it("lists by status", async () => {
    const repos = createRepositories();
    await repos.phrase.create({ id: "phrase_a", workspace_id: workspaceA, status: "risk_review_required" });
    await repos.phrase.create({ id: "phrase_b", workspace_id: workspaceA, status: "approved" });
    expect(await repos.phrase.listByStatus(workspaceA, "approved")).toHaveLength(1);
  });

  it("archives, rejects, and approves where applicable", async () => {
    const repos = createRepositories();
    await repos.draft.create({ id: "draft_a", workspace_id: workspaceA, status: "pending_approval" });
    expect(await repos.draft.approve("draft_a", "user_01")).toMatchObject({ status: "approved", approved_by: "user_01" });
    expect(await repos.draft.reject("draft_a", "user_01")).toMatchObject({ status: "rejected" });
    expect(await repos.draft.archive("draft_a")).toMatchObject({ status: "archived" });
  });
});
