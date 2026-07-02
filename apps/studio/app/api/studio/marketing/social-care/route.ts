import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeKernelPayload } from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../_auth";
import { sharedWorkspaceId } from "../../shared/_shared";

export const runtime = "nodejs";

const classifications = new Set([
  "buying_intent",
  "support",
  "complaint",
  "review",
  "collab",
  "wholesale",
  "custom_order",
  "question",
  "other"
]);

async function readBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

function checked(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function safeSlug(value: unknown) {
  return cleanText(value, "social_care").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "social_care";
}

function safeRedirectUrl(req: Request, next: unknown) {
  const value = cleanText(next);
  if (!value || !value.startsWith("/studio/") || value.includes("//")) return null;
  return new URL(value, req.url);
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, sharedWorkspaceId);
    const body = sanitizeKernelPayload(await readBody(req)) as Record<string, unknown>;
    const now = new Date().toISOString();
    const classification = classifications.has(cleanText(body.classification)) ? cleanText(body.classification) : "other";
    const platform = cleanText(body.platform, "manual");
    const commentText = cleanText(body.comment_text || body.commentText, "Manual/imported social comment.");
    const responseDraft = cleanText(body.response_draft || body.responseDraft);
    const linkedEntityType = ["customer", "lead"].includes(cleanText(body.linked_entity_type || body.linkedEntityType)) ? cleanText(body.linked_entity_type || body.linkedEntityType) : "none";
    const linkedEntityId = linkedEntityType === "none" ? "" : cleanText(body.linked_entity_id || body.linkedEntityId);
    const opportunityId = `socialcare_${safeSlug(platform)}_${Date.now()}`;
    const sourceLabel = `Manual social care - ${classification.replace(/_/g, " ")}`;
    const repos = createRepositories();

    const sourceRecord = await repos.shared.sourceRecords.create({
      id: `source_${opportunityId}`,
      workspace_id: sharedWorkspaceId,
      origin: checked(body.owner_verified) ? "owner_verified" : "manual",
      source_name: "social_comment",
      source_label: sourceLabel,
      source_url: cleanText(body.source_url || body.sourceUrl),
      provider: platform,
      confidence: "0.7000",
      owner_verified_at: checked(body.owner_verified) ? now : null,
      raw_payload: {
        featureClassification: "honest_foundation_feature",
        manualOnly: true,
        noLiveSocialInbox: true,
        platform,
        classification,
        commentText,
        linkedEntityType,
        linkedEntityId,
        responseDraft,
        ownerVerified: checked(body.owner_verified)
      }
    });

    const note = await repos.shared.notes.create({
      id: `note_${opportunityId}_response`,
      workspace_id: sharedWorkspaceId,
      entity_type: "social_care_opportunity",
      entity_id: opportunityId,
      body: responseDraft || "Response draft needed before any owner-managed reply.",
      note_type: "response_draft",
      source_record_id: sourceRecord.id,
      created_by: user.id
    });

    const followUpTitle = cleanText(body.follow_up_title || body.followUpTitle);
    const shouldCreateTask = checked(body.create_task) || Boolean(followUpTitle);
    const task = shouldCreateTask ? await repos.shared.tasks.create({
      id: `task_${opportunityId}_followup`,
      workspace_id: sharedWorkspaceId,
      entity_type: "social_care_opportunity",
      entity_id: opportunityId,
      title: followUpTitle || `Follow up on ${classification.replace(/_/g, " ")} social comment`,
      description: `Manual social care follow-up for ${platform}. No live social inbox action is performed.`,
      status: "pending",
      priority: ["buying_intent", "complaint", "wholesale", "custom_order"].includes(classification) ? "high" : "normal",
      source_record_id: sourceRecord.id
    }) : null;

    const event = await repos.shared.events.create({
      id: `event_${opportunityId}_created`,
      workspace_id: sharedWorkspaceId,
      entity_type: "social_care_opportunity",
      entity_id: opportunityId,
      event_type: "social_care_opportunity_created",
      event_label: "Manual social care opportunity recorded",
      payload: {
        platform,
        classification,
        linkedEntityType,
        linkedEntityId,
        hasResponseDraft: true,
        hasFollowUpTask: Boolean(task),
        noLiveSocialInbox: true
      },
      source_record_id: sourceRecord.id,
      source_label: sourceLabel,
      created_by: user.id
    });

    await repos.shared.auditLog.create({
      id: `auditlog_${opportunityId}_created`,
      workspace_id: sharedWorkspaceId,
      actor_id: user.id,
      entity_type: "social_care_opportunity",
      entity_id: opportunityId,
      action: "created",
      after: {
        sourceRecordId: sourceRecord.id,
        noteId: note?.id,
        taskId: task?.id,
        eventId: event.id,
        classification,
        manualOnly: true
      }
    });

    const redirectUrl = safeRedirectUrl(req, body.next);
    if (redirectUrl) return NextResponse.redirect(redirectUrl, { status: 303 });
    return NextResponse.json({
      ok: true,
      status: "created",
      opportunityId,
      records: {
        sourceRecord: sourceRecord.id,
        note: note?.id ?? null,
        task: task?.id ?? null,
        event: event.id
      }
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
