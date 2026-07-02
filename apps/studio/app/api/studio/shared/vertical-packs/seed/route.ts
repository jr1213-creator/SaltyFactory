import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import {
  createVerticalPackAutomationRuleRows,
  createVerticalPackSeedRows,
  createVerticalPackTemplateRows,
  safeKernelRecordForClient
} from "@saltyfactory/domain";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";
import { sharedWorkspaceId } from "../../_shared";

export const runtime = "nodejs";

async function upsertById(repo: { getById(id: string, workspaceId?: string): Promise<any>; create(row: any): Promise<any>; update(id: string, patch: any): Promise<any> }, row: any, workspaceId?: string) {
  const existing = await repo.getById(row.id, workspaceId);
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
    const user = await requireDraftMutationPermission(req, sharedWorkspaceId);
    const repos = createRepositories();
    const packs = [];
    for (const row of createVerticalPackSeedRows()) {
      packs.push(await upsertById(repos.shared.verticalPacks, { ...row, updated_by: user.id }));
    }
    const templates = [];
    for (const row of createVerticalPackTemplateRows(sharedWorkspaceId)) {
      if ("template_type" in row) {
        templates.push(await upsertById(repos.shared.templates, { ...row, updated_by: user.id }, sharedWorkspaceId));
      } else {
        templates.push(await upsertById(repos.shared.segments, { ...row, updated_by: user.id }, sharedWorkspaceId));
      }
    }
    const rules = [];
    for (const row of createVerticalPackAutomationRuleRows(sharedWorkspaceId)) {
      rules.push(await upsertById(repos.shared.automationRules, { ...row, updated_by: user.id }, sharedWorkspaceId));
    }
    if (redirectTo) return NextResponse.redirect(redirectTo, { status: 303 });
    return NextResponse.json({
      ok: true,
      status: "seeded",
      verticalPacks: packs.map(safeKernelRecordForClient),
      templatesAndSegments: templates.length,
      automationRules: rules.length
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
