import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, type BaseRepositoryContract, type WorkspaceRow } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../_auth";

export const crmWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export type CrmRepoKey =
  | "customers"
  | "timelineEvents"
  | "tasks"
  | "notes"
  | "customerCohorts"
  | "forms"
  | "formSubmissions"
  | "campaigns"
  | "leads"
  | "opportunities"
  | "serviceCases"
  | "conversations"
  | "conversationMessages"
  | "events"
  | "appointmentTypes"
  | "bookingRequests"
  | "consultations";

const idPrefixes: Record<CrmRepoKey, string> = {
  customers: "crm_customer",
  timelineEvents: "crm_timeline",
  tasks: "crm_task",
  notes: "crm_note",
  customerCohorts: "crm_segment",
  forms: "crm_form",
  formSubmissions: "crm_form_submission",
  campaigns: "crm_campaign",
  leads: "crm_lead",
  opportunities: "crm_opp",
  serviceCases: "crm_case",
  conversations: "crm_conv",
  conversationMessages: "crm_msg",
  events: "crm_event",
  appointmentTypes: "crm_appt",
  bookingRequests: "crm_booking",
  consultations: "crm_consult"
};

function newCrmId(key: CrmRepoKey) {
  return `${idPrefixes[key]}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function sanitizeCrmRecord(row: WorkspaceRow) {
  const serialized = JSON.stringify(row);
  if (/access_token|refresh_token|client_secret|api[_-]?token|DATABASE_URL|service_role|shpat_|printify_/i.test(serialized)) {
    return {
      id: row.id,
      workspace_id: row.workspace_id ?? row.workspaceId,
      status: row.status ?? "redacted",
      source_label: row.source_label ?? row.sourceLabel
    };
  }
  return row;
}

function crmRepo(repos: ReturnType<typeof createRepositories>, key: CrmRepoKey): BaseRepositoryContract {
  return (repos.crm as any)[key] as BaseRepositoryContract;
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

function cleanBody(body: Record<string, unknown>) {
  const clean: WorkspaceRow = { id: "" };
  for (const [key, value] of Object.entries(body)) {
    if (/access_token|refresh_token|client_secret|api[_-]?token|DATABASE_URL|service_role/i.test(key)) continue;
    if (["next", "workspace_id", "workspaceId", "created_by", "createdBy", "updated_by", "updatedBy", "archived_at", "archivedAt"].includes(key)) continue;
    if (value === undefined) continue;
    if (typeof value === "string" && /(_json|Json)$/.test(key) && /^[\[{]/.test(value.trim())) {
      try {
        clean[key] = JSON.parse(value);
        continue;
      } catch {
        clean[key] = value;
        continue;
      }
    }
    if (typeof value === "string" && /(_required|Required|_pinned|Pinned)$/.test(key) && ["true", "false"].includes(value)) {
      clean[key] = value === "true";
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

function safeRedirectUrl(req: Request, rawNext: unknown, id?: string) {
  const next = String(rawNext ?? "").trim();
  if (!next || !next.startsWith("/studio/") || next.includes("//")) return null;
  const path = id ? next.replace("{id}", encodeURIComponent(id)) : next;
  return new URL(path, req.url);
}

function eventNameFor(resource: string, action: "created" | "updated" | "archived") {
  if (resource === "notes" && action === "created") return ["note_added", "Note added"];
  if (resource === "tasks" && action === "created") return ["task_created", "Task created"];
  if (resource === "tasks" && action === "updated") return ["task_updated", "Task updated"];
  if (resource === "customers" && action === "created") return ["customer_created", "Customer created"];
  if (resource === "leads" && action === "created") return ["lead_created", "Lead created"];
  if (resource === "opportunities" && action === "updated") return ["opportunity_stage_changed", "Opportunity updated"];
  if (resource === "service-cases" && action === "updated") return ["service_case_status_changed", "Service case updated"];
  return [`${resource}_${action}`.replace(/-/g, "_"), `${resource.replace(/-/g, " ")} ${action}`];
}

function customerIdForTimeline(resource: string, row: WorkspaceRow, fallbackId: string) {
  if (resource === "customers") return fallbackId;
  return String(row.customer_id ?? row.customerId ?? "");
}

export async function listCrmRecords(req: Request, key: CrmRepoKey, resource: string) {
  try {
    await requireWorkspaceMember(req, crmWorkspaceId);
    const repos = createRepositories();
    const records = await crmRepo(repos, key).listByWorkspace(crmWorkspaceId);
    return NextResponse.json({ ok: true, status: "retrieved", resource, records: records.map(sanitizeCrmRecord) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}

export async function getCrmRecord(req: Request, key: CrmRepoKey, resource: string, id: string) {
  try {
    await requireWorkspaceMember(req, crmWorkspaceId);
    const repos = createRepositories();
    const record = await crmRepo(repos, key).getById(id, crmWorkspaceId);
    if (!record) return NextResponse.json({ ok: false, status: "not_found", resource, message: "Record not found." }, { status: 404 });
    return NextResponse.json({ ok: true, status: "retrieved", resource, record: sanitizeCrmRecord(record) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}

export async function createCrmRecord(req: Request, key: CrmRepoKey, resource: string, requiredFields: string[] = []) {
  try {
    const user = await requireDraftMutationPermission(req, crmWorkspaceId);
    const rawBody = await readBody(req);
    const body = cleanBody(rawBody);
    const missing = requiredFields.filter((field) => !String(body[field] ?? "").trim());
    if (missing.length) {
      return NextResponse.json({ ok: false, status: "validation_failed", resource, missing }, { status: 400 });
    }
    const row: WorkspaceRow = {
      ...body,
      id: String(body.id || newCrmId(key)),
      workspace_id: crmWorkspaceId,
      source_label: String(body.source_label ?? body.sourceLabel ?? "manual_entry"),
      status: String(body.status ?? "active"),
      created_by: user.id,
      updated_by: user.id
    };
    const repos = createRepositories();
    const created = await crmRepo(repos, key).create(row, {
      id: `audit_${idPrefixes[key]}_${Date.now()}`,
      workspace_id: crmWorkspaceId,
      entity_type: resource,
      entity_id: row.id,
      action: "created",
      actor_type: "human",
      actor_id: user.id,
      after_state: JSON.stringify(sanitizeCrmRecord(row)).slice(0, 8000),
      created_at: new Date().toISOString()
    });
    const [eventType, eventLabel] = eventNameFor(resource, "created");
    await repos.shared.events.create({
      id: `event_${idPrefixes[key]}_created_${Date.now()}`,
      workspace_id: crmWorkspaceId,
      entity_type: resource,
      entity_id: row.id,
      event_type: eventType,
      event_label: eventLabel,
      payload: sanitizeCrmRecord(row),
      source_label: String(row.source_label ?? "System-generated"),
      created_by: user.id
    });
    const customerId = customerIdForTimeline(resource, row, row.id);
    if (customerId && key !== "timelineEvents") {
      await repos.crm.timelineEvents.create({
        id: `crm_timeline_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        workspace_id: crmWorkspaceId,
        customer_id: customerId,
        event_type: eventType,
        title: eventLabel,
        body: String(row.title ?? row.name ?? row.subject ?? row.body ?? ""),
        source_label: String(row.source_label ?? "system_generated"),
        created_by: user.id
      });
    }
    const redirectUrl = safeRedirectUrl(req, (rawBody as Record<string, unknown>).next, row.id);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, status: "created", resource, record: sanitizeCrmRecord(created) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
    return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}

export async function updateCrmRecord(req: Request, key: CrmRepoKey, resource: string, id: string) {
  try {
    const user = await requireDraftMutationPermission(req, crmWorkspaceId);
    const repos = createRepositories();
    const existing = await crmRepo(repos, key).getById(id, crmWorkspaceId);
    if (!existing) return NextResponse.json({ ok: false, status: "not_found", resource, message: "Record not found." }, { status: 404 });
    const rawBody = await readBody(req);
    const cleanedBody = cleanBody(rawBody) as Record<string, unknown>;
    const { id: _ignoredId, workspace_id: _ignoredWorkspaceId, workspaceId: _ignoredWorkspaceIdCamel, ...body } = cleanedBody;
    const status = String(body.status ?? "");
    const patch: WorkspaceRow = {
      id,
      ...body,
      updated_by: user.id
    };
    if (status === "completed" && !patch.completed_at && !patch.completedAt) patch.completed_at = new Date().toISOString();
    const updated = await crmRepo(repos, key).update(id, patch, {
      id: `audit_${idPrefixes[key]}_update_${Date.now()}`,
      workspace_id: crmWorkspaceId,
      entity_type: resource,
      entity_id: id,
      action: "updated",
      actor_type: "human",
      actor_id: user.id,
      before_state: JSON.stringify(sanitizeCrmRecord(existing)).slice(0, 4000),
      after_state: JSON.stringify(sanitizeCrmRecord({ ...existing, ...patch })).slice(0, 4000),
      created_at: new Date().toISOString()
    });
    const [eventType, eventLabel] = eventNameFor(resource, status === "completed" ? "updated" : "updated");
    await repos.shared.events.create({
      id: `event_${idPrefixes[key]}_${Date.now()}`,
      workspace_id: crmWorkspaceId,
      entity_type: resource,
      entity_id: id,
      event_type: status === "completed" ? "task_completed" : eventType,
      event_label: status === "completed" ? `${resource} completed` : eventLabel,
      source_label: "System-generated",
      created_by: user.id
    });
    const customerId = customerIdForTimeline(resource, { ...existing, ...patch }, id);
    if (customerId && key !== "timelineEvents") {
      await repos.crm.timelineEvents.create({
        id: `crm_timeline_${idPrefixes[key]}_updated_${Date.now()}`,
        workspace_id: crmWorkspaceId,
        customer_id: customerId,
        event_type: status === "completed" ? "task_completed" : eventType,
        title: status === "completed" ? `${resource} completed` : eventLabel,
        body: String(patch.title ?? patch.name ?? patch.subject ?? patch.body ?? ""),
        source_label: "system_generated",
        created_by: user.id
      });
    }
    const redirectUrl = safeRedirectUrl(req, (rawBody as Record<string, unknown>).next, id);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({ ok: true, status: "updated", resource, record: sanitizeCrmRecord(updated) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}

export async function archiveCrmRecord(req: Request, key: CrmRepoKey, resource: string, id: string) {
  try {
    const user = await requireDraftMutationPermission(req, crmWorkspaceId);
    const repos = createRepositories();
    const existing = await crmRepo(repos, key).getById(id, crmWorkspaceId);
    if (!existing) return NextResponse.json({ ok: false, status: "not_found", resource, message: "Record not found." }, { status: 404 });
    const archived = await crmRepo(repos, key).update(id, { status: "archived", archived_at: new Date().toISOString(), updated_by: user.id }, {
      id: `audit_${idPrefixes[key]}_archive_${Date.now()}`,
      workspace_id: crmWorkspaceId,
      entity_type: resource,
      entity_id: id,
      action: "archived",
      actor_type: "human",
      actor_id: user.id,
      before_state: JSON.stringify(sanitizeCrmRecord(existing)).slice(0, 4000),
      created_at: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, status: "archived", resource, record: sanitizeCrmRecord(archived) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
