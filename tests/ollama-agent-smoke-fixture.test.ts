import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRepositories, createRepositoryStore, type WorkspaceRow } from "../packages/db/src/repositories/memory";
import { OllamaSmokeFixtureError, prepareOllamaSmokeDraft } from "../scripts/smoke-ollama-agent-local";

const workspaceId = "wks_default";

describe("Ollama smoke fixture", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("creates a schema-safe smoke product draft fixture when no reusable draft exists", async () => {
    const repos = createMemoryRepositories(createRepositoryStore());

    const prepared = await prepareOllamaSmokeDraft({ repos: repos as any, workspaceId });

    expect(prepared.reusedExistingDraft).toBe(false);
    expect(prepared.draft.id).toMatch(/^draft_ollama_smoke_/);
    expect(prepared.draft.brand).toBe("SaltyFactory");
    expect(prepared.draft.product_type).toBe("tee");
    expect(prepared.draft.collection).toBe("Private Beta Smoke Tests");
    expect(prepared.draft.shopify_status).toBe("not_published");
    expect(prepared.draft.printify_status).toBe("not_synced");
    expect(prepared.draft.asset_id).toMatch(/^asset_ollama_smoke_/);

    const asset = await repos.asset.getById(String(prepared.draft.asset_id), workspaceId);
    const publish = await repos.publish.getByProductDraftId(workspaceId, prepared.draft.id);

    expect(asset?.brief_id).toMatch(/^brief_ollama_smoke_/);
    expect(asset?.mime_type).toBe("image/png");
    expect(publish?.status).toBe("blocked");
  });

  it("reuses an existing valid product draft instead of inserting a stale smoke row", async () => {
    const repos = createMemoryRepositories(createRepositoryStore());
    await repos.cluster.create({
      id: "cluster_existing",
      workspace_id: workspaceId,
      name: "Existing cluster",
      signal_ids: [],
      keywords: ["existing"],
      aesthetic_tags: [],
      seasonality: [],
      target_customer: "owner",
      confidence: "0.9",
      status: "approved",
      approved_for_generation: true
    } as WorkspaceRow);
    await repos.phrase.create({
      id: "phrase_existing",
      workspace_id: workspaceId,
      cluster_id: "cluster_existing",
      text: "Existing tee",
      generated_by: "fixture",
      generation_prompt_ref: "fixture",
      status: "approved",
      trademark_review: {},
      approved_for_design: true
    } as WorkspaceRow);
    await repos.brief.create({
      id: "brief_existing",
      workspace_id: workspaceId,
      phrase_id: "phrase_existing",
      cluster_id: "cluster_existing",
      collection: "Existing",
      product_targets: ["tee"],
      style_direction: {},
      generation_prompt: "fixture",
      negative_prompt: "none",
      status: "approved",
      approved_for_generation: true
    } as WorkspaceRow);
    await repos.asset.create({
      id: "asset_existing",
      workspace_id: workspaceId,
      brief_id: "brief_existing",
      asset_type: "generated_source_art",
      storage_bucket: "local-dev-private-assets",
      file_path: "workspaces/wks_default/private/assets/asset_existing.png",
      file_size_bytes: 12,
      mime_type: "image/png",
      extension: "png",
      visibility: "private",
      width: 3000,
      height: 3000,
      dpi: 300,
      transparent_background: true,
      generator: "huggingface",
      model: "fixture",
      qa_status: "passed",
      risk_status: "pending",
      approved_for_mockup: true
    } as WorkspaceRow);
    await repos.draft.create({
      id: "draft_existing",
      workspace_id: workspaceId,
      brand: "SaltyFactory",
      title: "Existing draft",
      description: "Existing draft description.",
      product_type: "tee",
      collection: "Existing",
      tags: [],
      asset_id: "asset_existing",
      mockup_ids: [],
      variant_ids: [],
      status: "draft",
      approval_status: "pending",
      shopify_status: "not_published",
      printify_status: "not_synced",
      public_projection: {}
    } as WorkspaceRow);

    const prepared = await prepareOllamaSmokeDraft({ repos: repos as any, workspaceId });

    expect(prepared.reusedExistingDraft).toBe(true);
    expect(prepared.draft.id).toBe("draft_existing");
  });

  it("surfaces product draft fixture insert failures as fixture_setup_failed", async () => {
    const repos = createMemoryRepositories(createRepositoryStore());
    vi.spyOn(repos.draft, "create").mockRejectedValueOnce(new Error("insert into product_drafts failed"));

    await expect(prepareOllamaSmokeDraft({ repos: repos as any, workspaceId })).rejects.toMatchObject({
      name: "OllamaSmokeFixtureError",
      code: "fixture_setup_failed"
    });
  });
});
