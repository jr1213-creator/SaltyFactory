import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import {
  defaultCrmAppointmentTypes,
  defaultCrmCaptureForms,
  defaultCrmMessageTemplates,
  defaultCrmSegments,
  defaultCrmTaskTemplates
} from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";
import { crmWorkspaceId } from "../../crm/_shared";

export const runtime = "nodejs";

async function upsert(repo: { getById(id: string, workspaceId?: string): Promise<any>; create(row: any): Promise<any>; update(id: string, patch: any): Promise<any> }, row: any) {
  const existing = await repo.getById(row.id, crmWorkspaceId);
  if (existing) return repo.update(row.id, row);
  return repo.create(row);
}

async function readNext(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("form")) return "";
  const form = await req.formData();
  return String(form.get("next") ?? "");
}

function safeRedirectUrl(req: Request, next: string) {
  if (!next.startsWith("/studio/") || next.includes("//")) return null;
  return new URL(next, req.url);
}

export async function POST(req: Request) {
  try {
    const redirectTo = safeRedirectUrl(req, await readNext(req));
    const user = await requireDraftMutationPermission(req, crmWorkspaceId);
    const repos = createRepositories();
    const segments = await Promise.all(defaultCrmSegments.map((segment) => upsert(repos.crm.customerCohorts, {
      id: `crmseg_${segment.key}`,
      workspace_id: crmWorkspaceId,
      key: segment.key,
      name: segment.name,
      description: segment.description,
      query_definition: { sourceDataRequired: segment.sourceDataRequired },
      readiness: segment.sourceDataRequired.join(", "),
      suggestedAction: segment.suggestedAction,
      source_label: "system_generated",
      status: "active",
      updated_by: user.id
    })));
    const taskTemplates = await Promise.all(defaultCrmTaskTemplates.map((template) => upsert(repos.crm.taskTemplates, {
      id: `crmtasktpl_${template.key}`,
      workspace_id: crmWorkspaceId,
      title: template.title,
      description: template.description,
      trigger_key: template.triggerKey,
      priority: template.defaultPriority,
      source_label: template.sourceLabel,
      status: "active",
      updated_by: user.id
    })));
    const messageTemplates = await Promise.all(defaultCrmMessageTemplates.map((template) => upsert(repos.crm.messageTemplates, {
      id: `crmmsg_${template.key}`,
      workspace_id: crmWorkspaceId,
      name: template.name,
      subject: template.subject,
      body: template.body,
      source_label: template.sourceLabel,
      status: template.status,
      updated_by: user.id
    })));
    const forms = await Promise.all(defaultCrmCaptureForms.map(([key, title, description]) => upsert(repos.crm.forms, {
      id: `crmform_${key}`,
      workspace_id: crmWorkspaceId,
      public_form_id: key,
      title,
      description,
      fields_json: [{ name: "name" }, { name: "email" }, { name: "phone" }, { name: "interest" }, { name: "consent" }],
      target_segment_key: key,
      suggested_follow_up_task: "Create follow-up task",
      consent_language: "Consent language placeholder required before public activation.",
      embed_readiness_status: "future_integration",
      source_label: "system_generated",
      status: "draft",
      updated_by: user.id
    })));
    const appointmentTypes = await Promise.all(defaultCrmAppointmentTypes.map((type) => upsert(repos.crm.appointmentTypes, {
      id: `crmappt_${type.key}`,
      workspace_id: crmWorkspaceId,
      name: type.name,
      duration_minutes: type.durationMinutes,
      booking_readiness: type.bookingReadiness,
      source_label: "system_generated",
      status: "active",
      updated_by: user.id
    })));
    await repos.shared.events.create({
      id: `event_customer_setup_${Date.now()}`,
      workspace_id: crmWorkspaceId,
      entity_type: "customer_command_center",
      entity_id: crmWorkspaceId,
      event_type: "setup_defaults_seeded",
      event_label: "Customer Command Center defaults seeded",
      source_label: "System-generated",
      created_by: user.id
    });
    if (redirectTo) return NextResponse.redirect(redirectTo, { status: 303 });
    return NextResponse.json({
      ok: true,
      status: "seeded",
      segments: segments.length,
      taskTemplates: taskTemplates.length,
      messageTemplates: messageTemplates.length,
      forms: forms.length,
      appointmentTypes: appointmentTypes.length
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
