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
  | "campaigns"
  | "leads"
  | "opportunities"
  | "serviceCases"
  | "conversations"
  | "events"
  | "appointmentTypes";

const idPrefixes: Record<CrmRepoKey, string> = {
  customers: "crm_customer",
  timelineEvents: "crm_timeline",
  tasks: "crm_task",
  notes: "crm_note",
  customerCohorts: "crm_segment",
  forms: "crm_form",
  campaigns: "crm_campaign",
  leads: "crm_lead",
  opportunities: "crm_opp",
  serviceCases: "crm_case",
  conversations: "crm_conv",
  events: "crm_event",
  appointmentTypes: "crm_appt"
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

function crmRepo(key: CrmRepoKey): BaseRepositoryContract {
  return (createRepositories().crm as any)[key] as BaseRepositoryContract;
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
    if (value === undefined) continue;
    clean[key] = value;
  }
  return clean;
}

export async function listCrmRecords(req: Request, key: CrmRepoKey, resource: string) {
  try {
    await requireWorkspaceMember(req, crmWorkspaceId);
    const records = await crmRepo(key).listByWorkspace(crmWorkspaceId);
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
    const record = await crmRepo(key).getById(id, crmWorkspaceId);
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
    const body = cleanBody(await readBody(req));
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
    const created = await crmRepo(key).create(row, {
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
    return NextResponse.json({ ok: true, status: "created", resource, record: sanitizeCrmRecord(created) });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
