import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject", "request_changes"]),
  notes: z.string().trim().max(1000).optional().default("")
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const parsed = reviewSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Invalid AI output review decision." }, { status: 400 });
    }
    const repos = createRepositories();
    const output = await repos.aiEmployee.outputs.getById(id, workspaceId);
    if (!output) return notFoundApiResponse();
    const nextStatus = parsed.data.decision === "approve" ? "approved" : parsed.data.decision === "reject" ? "rejected" : "changes_requested";
    const updated = await repos.aiEmployee.outputs.update(id, {
      status: nextStatus,
      approved_by: parsed.data.decision === "approve" ? user.id : null,
      approved_at: parsed.data.decision === "approve" ? new Date().toISOString() : null,
      updated_by: user.id,
      metadata: {
        ...((output.metadata ?? {}) as Record<string, unknown>),
        reviewDecision: parsed.data.decision,
        reviewNotes: parsed.data.notes,
        reviewedBy: user.id,
        reviewedAt: new Date().toISOString(),
        providerActionExecuted: false
      }
    } as any);
    await repos.audit.write({
      id: `audit_ai_output_review_${Date.now()}`,
      workspace_id: workspaceId,
      entity_type: "ai_employee_output",
      entity_id: id,
      action: parsed.data.decision === "approve" ? "approval_granted" : parsed.data.decision === "reject" ? "rejected" : "review_requested",
      actor_type: "human",
      actor_id: user.id,
      before_state: String(output.status ?? ""),
      after_state: nextStatus,
      notes: parsed.data.notes || "AI employee output reviewed. No provider action executed."
    });
    return NextResponse.json({
      ok: true,
      status: nextStatus,
      output: updated,
      providerAction: "not_executed",
      message: "AI employee output review was saved. Provider actions remain separately approval-gated."
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
