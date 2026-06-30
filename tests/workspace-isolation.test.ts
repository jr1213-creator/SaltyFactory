import { describe, expect, it } from "vitest";
import { createRepositories, requireWorkspaceAccess } from "@saltyfactory/db";
import { workspaceA, workspaceB } from "./helpers";

describe("workspace isolation", () => {
  it("workspace A cannot read workspace B records through getById", async () => {
    const repos = createRepositories();
    await repos.asset.create({ id: "asset_b", workspace_id: workspaceB, status: "pending" });
    expect(await repos.asset.getById("asset_b", workspaceA)).toBeNull();
  });

  it("workspace A list does not return workspace B data", async () => {
    const repos = createRepositories();
    await repos.brief.create({ id: "brief_a", workspace_id: workspaceA, status: "draft" });
    await repos.brief.create({ id: "brief_b", workspace_id: workspaceB, status: "draft" });
    expect(await repos.brief.listByWorkspace(workspaceA)).toEqual([expect.objectContaining({ id: "brief_a" })]);
  });

  it("organization membership is required for workspace helpers", () => {
    expect(requireWorkspaceAccess([{ user_id: "user_01", workspace_id: workspaceA, status: "active" }], "user_01", workspaceA)).toBe(true);
    expect(() => requireWorkspaceAccess([], "user_01", workspaceA)).toThrow("workspace_access_denied");
  });
});
