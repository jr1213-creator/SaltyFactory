import { describe, expect, it } from "vitest";
import { createRepositories } from "@saltyfactory/db";
import { workspaceA } from "./helpers";

describe("repositories product and job flows", () => {
  it("product draft repository preserves variants, mockups, and tags", async () => {
    const repos = createRepositories();
    const draft = await repos.draft.create({ id: "draft_a", workspace_id: workspaceA, status: "approved", approval_status: "approved", tags: ["western", "coastal"], mockup_ids: ["mockup_1"], variant_ids: ["var_1"], title: "Tee", description: "Desc", public_handle: "tee" });
    expect(draft.tags).toEqual(["western", "coastal"]);
    expect(draft.mockup_ids).toEqual(["mockup_1"]);
    expect(draft.variant_ids).toEqual(["var_1"]);
  });

  it("storefront projection excludes private factory data", async () => {
    const repos = createRepositories();
    await repos.draft.create({ id: "draft_a", workspace_id: workspaceA, status: "published", title: "Tee", description: "Desc", public_handle: "tee", generation_prompt: "private" });
    const projection = await repos.draft.listApprovedForStorefront(workspaceA);
    expect(projection[0]).not.toHaveProperty("generation_prompt");
    expect(projection[0]).toMatchObject({ title: "Tee", handle: "tee" });
  });

  it("generation job repository handles queued running failed completed statuses", async () => {
    const repos = createRepositories();
    await repos.job.create({ id: "genjob_a", workspace_id: workspaceA, status: "queued", retry_count: 0, max_retries: 3 });
    expect(await repos.job.claimQueued(workspaceA)).toMatchObject({ status: "running" });
    expect(await repos.job.markFailed("genjob_a", "rate_limited", true)).toMatchObject({ status: "queued", retry_count: 1 });
    await repos.job.claimQueued(workspaceA);
    expect(await repos.job.markCompleted("genjob_a", "asset_1")).toMatchObject({ status: "completed", output_asset_id: "asset_1" });
  });

  it("max retries marks generation job failed", async () => {
    const repos = createRepositories();
    await repos.job.create({ id: "genjob_b", workspace_id: workspaceA, status: "running", retry_count: 2, max_retries: 3 });
    expect(await repos.job.markFailed("genjob_b", "provider_error", true)).toMatchObject({ status: "failed", retry_count: 3 });
  });
});
