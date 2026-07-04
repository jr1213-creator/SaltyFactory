import crypto from "node:crypto";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { createStorageProvider } from "@saltyfactory/storage";
import type { RuntimeConfig } from "@saltyfactory/config";
import type { RepositoryBundle, WorkspaceRow } from "@saltyfactory/db";
import type { CommerceResult } from "@saltyfactory/commerce";

export type ProviderBlock = {
  ok: false;
  status: "blocked_by_guardrail" | "not_configured";
  blockingReasons: string[];
  setupRequired?: string[];
};

export type MediaSource = {
  fileName: string;
  url?: string;
  contents?: string;
  buffer?: Buffer;
  checksum?: string;
};

const now = () => new Date().toISOString();
const asArray = (value: unknown) => Array.isArray(value) ? value : [];
const text = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function metadataOf(row: WorkspaceRow | null | undefined) {
  return row?.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
}

export function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "asset";
}

export function localPrivatePathFor(row: WorkspaceRow, workspaceId: string) {
  const filePath = text(row.file_path ?? row.filePath ?? row.storage_key ?? row.storageKey);
  const basename = path.basename(filePath);
  const kind = filePath.includes("/mockups/") ? "mockups" : "assets";
  return path.resolve(process.cwd(), ".saltyfactory-private", kind, safeSegment(workspaceId), basename);
}

export async function privateMediaSourceFor(row: WorkspaceRow, workspaceId: string, config: RuntimeConfig): Promise<MediaSource | ProviderBlock> {
  const metadata = metadataOf(row);
  const fileName = text(row.original_filename ?? row.originalFilename, `${row.id}.png`);
  const directUrl = text(metadata.public_url ?? metadata.publicUrl ?? metadata.media_url ?? metadata.mediaUrl ?? metadata.signed_url ?? metadata.signedUrl);
  if (directUrl) return { fileName, url: directUrl };

  const storageKey = text(row.file_path ?? row.filePath ?? row.storage_key ?? row.storageKey);
  if (config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY && storageKey) {
    const storage = createStorageProvider(config);
    const signed = await storage.createSignedPrivateUrl(storageKey, 1800);
    if (signed.ok && signed.url) return { fileName, url: signed.url };
  }

  try {
    const buffer = await readFile(localPrivatePathFor(row, workspaceId));
    return {
      fileName,
      contents: buffer.toString("base64"),
      buffer,
      checksum: crypto.createHash("sha256").update(buffer).digest("hex")
    };
  } catch {
    return {
      ok: false,
      status: "not_configured",
      blockingReasons: ["private_asset_bytes_or_signed_url_required"],
      setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET"]
    };
  }
}

export async function getApprovedGeneratedArtwork(input: { repos: RepositoryBundle; workspaceId: string; draft: WorkspaceRow }) {
  const assetId = text(input.draft.asset_id ?? input.draft.assetId);
  if (!assetId) {
    return {
      ok: false as const,
      status: "blocked_by_guardrail" as const,
      blockingReasons: ["approved_generated_artwork_required"]
    };
  }
  const asset = await input.repos.asset.getById(assetId, input.workspaceId);
  if (!asset) {
    return {
      ok: false as const,
      status: "blocked_by_guardrail" as const,
      blockingReasons: ["approved_generated_artwork_required"]
    };
  }
  const generator = text(asset.generator);
  const approved = asset.approved_for_mockup === true || asset.approvedForMockup === true;
  const qaPassed = text(asset.qa_status ?? asset.qaStatus) === "passed";
  const generated = generator !== "manual_upload" && generator !== "none";
  if (!approved || !qaPassed || !generated) {
    return {
      ok: false as const,
      status: "blocked_by_guardrail" as const,
      blockingReasons: [
        !generated && "approved_generated_artwork_required",
        !qaPassed && "print_file_qa_passed_required",
        !approved && "artwork_owner_approval_required"
      ].filter(Boolean) as string[]
    };
  }
  return { ok: true as const, asset };
}

export async function getApprovedMockupMedia(input: { repos: RepositoryBundle; workspaceId: string; draft: WorkspaceRow; config: RuntimeConfig }) {
  const mockupIds = asArray(input.draft.mockup_ids ?? input.draft.mockupIds).map(String);
  const media: Array<MediaSource & { mockupId: string }> = [];
  const blockers: string[] = [];

  for (const mockupId of mockupIds) {
    const mockup = await input.repos.mockup.getById(mockupId, input.workspaceId);
    if (!mockup) {
      blockers.push("approved_mockup_missing");
      continue;
    }
    const approved = mockup.approved_for_product === true || mockup.approvedForProduct === true || text(mockup.status) === "approved";
    if (!approved) {
      blockers.push("approved_mockup_missing");
      continue;
    }
    const source = await privateMediaSourceFor(mockup, input.workspaceId, input.config);
    if ("ok" in source) {
      blockers.push(...source.blockingReasons);
      continue;
    }
    if (!source.url) {
      blockers.push("shopify_media_requires_signed_or_public_url");
      continue;
    }
    media.push({ ...source, mockupId });
  }

  const printifyRefs = (await input.repos.printify.listByWorkspace(input.workspaceId))
    .filter((row) => String(row.product_draft_id ?? row.productDraftId ?? "") === input.draft.id);
  for (const ref of printifyRefs) {
    const urls = asArray(ref.mockup_urls ?? ref.mockupUrls).map(String).filter((url) => /^https?:\/\//i.test(url));
    urls.forEach((url, index) => {
      if (!media.some((item) => item.url === url)) {
        media.push({
          mockupId: `printify:${ref.id}:${index}`,
          fileName: `printify-${safeSegment(ref.id)}-${index + 1}.png`,
          url
        });
      }
    });
  }

  if (!media.length) {
    return {
      ok: false as const,
      status: "blocked_by_guardrail" as const,
      blockingReasons: blockers.length ? [...new Set(blockers)] : ["approved_mockup_media_required", "printify_mockup_urls_required"],
      setupRequired: blockers.includes("shopify_media_requires_signed_or_public_url")
        ? ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_PRIVATE_ASSETS_BUCKET"]
        : undefined
    };
  }
  return { ok: true as const, media };
}

export async function getDraftVariants(input: { repos: RepositoryBundle; workspaceId: string; draftId: string }) {
  const variants = await input.repos.variant.listByDraft(input.workspaceId, input.draftId);
  if (!variants.length) {
    return {
      ok: false as const,
      status: "blocked_by_guardrail" as const,
      blockingReasons: ["product_variants_required"]
    };
  }
  return { ok: true as const, variants };
}

export function printifyVariantPayload(variants: WorkspaceRow[]) {
  return variants.map((variant) => ({
    id: Number(variant.printify_variant_id ?? variant.printifyVariantId),
    price: Math.round(Number(variant.price ?? 0) * 100),
    is_enabled: variant.active !== false
  })).filter((variant) => Number.isFinite(variant.id) && variant.id > 0 && variant.price > 0);
}

export function shopifyVariantPayload(variants: WorkspaceRow[]) {
  return variants.map((variant) => ({
    price: Number(variant.price ?? 0).toFixed(2),
    sku: text(variant.sku),
    option1: text(variant.size, "Default")
  }));
}

export function defaultPrintAreas(input: { uploadId: string; variantIds: string[]; placement?: Record<string, unknown> }) {
  const placement = input.placement ?? {};
  return [{
    variant_ids: input.variantIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
    placeholders: [{
      position: text(placement.position, "front"),
      images: [{
        id: input.uploadId,
        x: Number(placement.x ?? 0.5),
        y: Number(placement.y ?? 0.5),
        scale: Number(placement.scale ?? 1),
        angle: Number(placement.angle ?? 0)
      }]
    }]
  }];
}

export function extractPrintifyMockupUrls(payload: unknown): string[] {
  const urls = new Set<string>();
  const mediaPathHints = ["image", "images", "mockup", "mockups", "preview", "src", "url"];

  function walk(value: unknown, path: string[]) {
    if (typeof value === "string") {
      const isUrl = /^https?:\/\//i.test(value);
      const pathSuggestsMedia = path.some((segment) => mediaPathHints.some((hint) => segment.toLowerCase().includes(hint)));
      if (isUrl && pathSuggestsMedia) urls.add(value);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, String(index)]));
      return;
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      walk(nested, [...path, key]);
    }
  }

  walk(payload, []);
  return [...urls];
}

export function extractProviderProductId(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  return text(data.id ?? data.product_id ?? data.productId);
}

export async function fetchPrintifyProductWithMockupRetry(
  printify: { getProduct(id: string): Promise<CommerceResult<unknown>> },
  productId: string,
  input: { attempts?: number; delaysMs?: number[]; wait?: (ms: number) => Promise<void> } = {}
) {
  const attempts = Math.max(1, input.attempts ?? 3);
  const delaysMs = input.delaysMs ?? [250, 1000];
  const wait = input.wait ?? sleep;
  let lastData: Record<string, unknown> | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await printify.getProduct(productId);
    if (!result.ok) {
      return {
        ok: false as const,
        status: "mockup_sync_failed",
        error: result.error,
        retryable: result.retryable,
        rateLimited: result.rateLimited,
        setupRequired: result.setupRequired
      };
    }
    lastData = result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
    const mockupUrls = extractPrintifyMockupUrls(lastData);
    if (mockupUrls.length) {
      return {
        ok: true as const,
        status: "mockups_synced",
        product: lastData,
        mockupUrls,
        attempts: attempt
      };
    }
    if (attempt < attempts) await wait(delaysMs[Math.min(attempt - 1, delaysMs.length - 1)] ?? 1000);
  }

  return {
    ok: true as const,
    status: "mockups_pending",
    product: lastData,
    mockupUrls: [] as string[],
    attempts
  };
}

export async function writeProviderEvent(input: {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
  provider: "printify" | "shopify";
  entityId: string;
  action: string;
  status: string;
  details?: Record<string, unknown>;
}) {
  const event = {
    id: `event_${input.provider}_${Date.now()}`,
    workspace_id: input.workspaceId,
    entity_type: `${input.provider}_product_ref`,
    entity_id: input.entityId,
    event_type: input.action,
    event_label: `${input.provider} ${input.action}`,
    title: `${input.provider} ${input.action}`,
    body: input.status,
    status: input.status,
    source_label: "provider_api",
    created_by: input.actorId,
    updated_by: input.actorId,
    payload: {
      status: input.status,
      details: input.details ?? {}
    },
    metadata: input.details ?? {}
  };
  await input.repos.shared.events.create(event);
  await input.repos.audit.write({
    id: `audit_${input.provider}_${Date.now()}`,
    workspace_id: input.workspaceId,
    entity_type: `${input.provider}_product_ref`,
    entity_id: input.entityId,
    action: input.action,
    actor_type: "human",
    actor_id: input.actorId,
    after_state: input.status,
    created_at: now()
  } as WorkspaceRow);
}
