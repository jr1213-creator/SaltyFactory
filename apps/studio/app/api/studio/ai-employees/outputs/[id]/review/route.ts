import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { sanitizeProviderError } from "@saltyfactory/security";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../../_auth";
import { reviewAiEmployeeOutput } from "../../../_workflow";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject", "request_changes", "needs_edits", "convert_to_task"]),
  notes: z.string().trim().max(1000).optional().default("")
});

async function readBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await params;
    const parsed = reviewSchema.safeParse(await readBody(req));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Invalid AI output review decision." }, { status: 400 });
    }
    const repos = createRepositories();
    const result = await reviewAiEmployeeOutput({
      repos,
      workspaceId,
      actorId: user.id,
      outputId: id,
      decision: parsed.data.decision,
      notes: parsed.data.notes
    });
    if (!result) return notFoundApiResponse();
    const status = result.blocked ? 409 : 200;
    return NextResponse.json({ ok: !result.blocked, ...result, message: result.blocked ? result.message : "AI employee output review was saved. Provider actions remain separately approval-gated." }, { status });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
