import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, type BaseRepositoryContract, type WorkspaceRow } from "@saltyfactory/db";
import { safeKernelRecordForClient, sanitizeKernelPayload } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../_auth";

export const sharedWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

const resources = {
  "provider-connections": { key: "providerConnections", prefix: "provconn", required: ["provider"] },
  "source-records": { key: "sourceRecords", prefix: "source", required: ["source_name", "source_label"] },
  events: { key: "events", prefix: "event", required: ["entity_type", "entity_id", "event_type", "event_label"] },
  "audit-log": { key: "auditLog", prefix: "auditlog", required: ["entity_type", "entity_id", "action"] },
  approvals: { key: "approvals", prefix: "approval", required: ["entity_type", "entity_id", "approval_type"] },
  tasks: { key: "tasks", prefix: "task", required: ["entity_type", "entity_id", "title"] },
  notes: { key: "notes", prefix: "note", required: ["entity_type", "entity_id", "body"] },
  recommendations: { key: "recommendations", prefix: "rec", required: ["entity_type", "entity_id", "recommendation_type", "title", "body"] },
  "readiness-scores": { key: "readinessScores", prefix: "score", required: ["entity_type", "entity_id", "score_type"] },
  "export-packages": { key: "exportPackages", prefix: "export", required: ["entity_type", "entity_id", "package_type", "title"] },
  assets: { key: "assets", prefix: "assetref", required: ["entity_type", "entity_id", "asset_type", "title"] },
  templates: { key: "templates", prefix: "template", required: ["template_type", "name"] },
  "automation-rules": { key: "automationRules", prefix: "autorule", required: ["name", "trigger"] },
  segments: { key: "segments", prefix: "segment", required: ["name", "entity_type"] },
  "vertical-packs": { key: "verticalPacks", prefix: "vpack", required: ["key", "name"] },
  campaigns: { key: "campaigns", prefix: "campaign", required: ["name"] },
  "campaign-channels": { key: "campaignChannels", prefix: "channel", required: ["channel_type"] },
  "utm-links": { key: "utmLinks", prefix: "utm", required: ["base_url", "source", "medium", "campaign_name", "generated_url"] }
} as const;

export type SharedResourceSlug = keyof typeof resources;

export function sharedResourceConfig(resource: string) {
  const config = resources[resource as SharedResourceSlug];
  if (!config) throw Object.assign(new Error("Unknown shared resource."), { status: 404 });
  return config;
}

function repoFor(resource: string, repos = createRepositories()): BaseRepositoryContract {
  const config = sharedResourceConfig(resource);
  return (repos.shared as any)[config.key] as BaseRepositoryContract;
}

function newSharedId(resource: string) {
  const config = sharedResourceConfig(resource);
  return `${config.prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function readBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

function normalizeInput(body: Record<string, unknown>) {
  const clean = sanitizeKernelPayload(body) as Record<string, unknown>;
  delete clean.workspace_id;
  delete clean.workspaceId;
  delete clean.account_id;
  delete clean.accountId;
  delete clean.next;
  for (const [key, value] of Object.entries(clean)) {
    if (typeof value === "string" && /(_json|Json|content|criteria|blockers|metadata|spec|condition|action|config|query_definition|manual_offer|draft_content)$/i.test(key) && /^[\[{]/.test(value.trim())) {
      try {
        clean[key] = JSON.parse(value);
      } catch {
        clean[key] = value;
      }
    }
    if (typeof value === "string" && ["true", "false"].includes(value) && /^(active|created_by_app|owner_action_required)$/i.test(key)) {
      clean[key] = value === "true";
    }
  }
  return clean;
}

function safeRedirectUrl(req: Request, rawNext: unknown, id?: string) {
  const next = String(rawNext ?? "").trim();
  if (!next || !next.startsWith("/studio/") || next.includes("//")) return null;
  return new URL(id ? next.replace("{id}", encodeURIComponent(id)) : next, req.url);
}

function withAliases(row: Record<string, unknown>) {
  const copy = { ...row };
  for (const [key, value] of Object.entries(row)) {
    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    if (!(snake in copy)) copy[snake] = value;
  }
  return copy;
}

function output(row: WorkspaceRow) {
  return safeKernelRecordForClient(withAliases(row));
}

export async function listSharedRecords(req: Request, resource: string) {
  try {
    await requireWorkspaceMember(req, sharedWorkspaceId);
    const records = await repoFor(resource).listByWorkspace(sharedWorkspaceId);
    return NextResponse.json({ ok: true, status: "retrieved", resource, records: records.map(output) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      const status = typeof error === "object" && error && "status" in error ? Number((error as any).status) : 500;
      return NextResponse.json({ ok: false, status: status === 404 ? "not_found" : "failed", message: sanitizeProviderError(error) }, { status });
    }
  }
}

export async function createSharedRecord(req: Request, resource: string) {
  try {
    const user = await requireDraftMutationPermission(req, sharedWorkspaceId);
    const config = sharedResourceConfig(resource);
    const rawBody = await readBody(req);
    const body = normalizeInput(rawBody);
    const missing = config.required.filter((field) => !String(body[field] ?? "").trim());
    if (missing.length) return NextResponse.json({ ok: false, status: "validation_failed", resource, missing }, { status: 400 });
    const row: WorkspaceRow = {
      ...body,
      id: String(body.id || newSharedId(resource)),
      workspace_id: sharedWorkspaceId,
      status: String(body.status ?? (resource === "approvals" ? "pending" : "draft")),
      created_by: user.id,
      updated_by: user.id
    };
    const repos = createRepositories();
    const created = await repoFor(resource, repos).create(row);
    await repos.shared.auditLog.create({
      id: `auditlog_${resource}_${Date.now()}`,
      workspace_id: sharedWorkspaceId,
      actor_id: user.id,
      entity_type: resource,
      entity_id: created.id,
      action: "created",
      after: output(created)
    });
    const redirectUrl = safeRedirectUrl(req, (rawBody as Record<string, unknown>).next, created.id);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, status: "created", resource, record: output(created) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}

export async function getSharedRecord(req: Request, resource: string, id: string) {
  try {
    await requireWorkspaceMember(req, sharedWorkspaceId);
    const record = await repoFor(resource).getById(id, sharedWorkspaceId);
    if (!record) return NextResponse.json({ ok: false, status: "not_found", resource }, { status: 404 });
    return NextResponse.json({ ok: true, status: "retrieved", resource, record: output(record) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}

export async function updateSharedRecord(req: Request, resource: string, id: string) {
  try {
    const user = await requireDraftMutationPermission(req, sharedWorkspaceId);
    const rawBody = await readBody(req);
    const body = normalizeInput(rawBody);
    delete body.id;
    const patch: Record<string, unknown> = { ...body, updated_by: user.id };
    const status = String(patch.status ?? "");
    if (resource === "approvals" && ["approved", "rejected", "needs_edits", "dismissed"].includes(status)) {
      patch.decided_by = user.id;
      patch.decided_at = new Date().toISOString();
    }
    if (resource === "tasks" && status === "completed") patch.completed_at = new Date().toISOString();
    const repos = createRepositories();
    const existing = await repoFor(resource, repos).getById(id, sharedWorkspaceId);
    if (!existing) return NextResponse.json({ ok: false, status: "not_found", resource }, { status: 404 });
    const updated = await repoFor(resource, repos).update(id, patch as WorkspaceRow);
    if (String(updated.workspace_id ?? updated.workspaceId) !== sharedWorkspaceId) {
      return NextResponse.json({ ok: false, status: "not_found", resource }, { status: 404 });
    }
    await repos.shared.events.create({
      id: `event_${resource}_${Date.now()}`,
      workspace_id: sharedWorkspaceId,
      entity_type: resource,
      entity_id: id,
      event_type: "updated",
      event_label: `${resource} updated`,
      source_label: "System-generated",
      created_by: user.id
    });
    const redirectUrl = safeRedirectUrl(req, (rawBody as Record<string, unknown>).next, id);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, status: "updated", resource, record: output(updated) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}

export async function archiveSharedRecord(req: Request, resource: string, id: string) {
  try {
    const user = await requireDraftMutationPermission(req, sharedWorkspaceId);
    const repos = createRepositories();
    const existing = await repoFor(resource, repos).getById(id, sharedWorkspaceId);
    if (!existing) return NextResponse.json({ ok: false, status: "not_found", resource }, { status: 404 });
    const archived = await repoFor(resource, repos).update(id, { status: "archived", archived_at: new Date().toISOString(), updated_by: user.id });
    if (String(archived.workspace_id ?? archived.workspaceId) !== sharedWorkspaceId) {
      return NextResponse.json({ ok: false, status: "not_found", resource }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status: "archived", resource, record: output(archived) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
