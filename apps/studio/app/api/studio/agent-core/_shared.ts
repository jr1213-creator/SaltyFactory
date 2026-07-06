import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import {
  AGENT_CORE_SOURCE_NOT_FOUND,
  AGENT_CORE_SOURCE_REQUIRED,
  COMMERCE_AGENT_INVALID_BODY,
  COMMERCE_AGENT_INVALID_JSON
} from "@saltyfactory/ai-free";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { badRequest, readJsonOrFormBody, shopManagerFailureStatus, shopManagerWorkspaceId, stringField } from "../_shop-manager-agent-os";

export const runtime = "nodejs";

export type AgentCoreBody = {
  sourceEntityType?: string | undefined;
  sourceEntityId?: string | undefined;
  launchPlanId?: string | undefined;
  content?: string | undefined;
  suggestedRewrite?: string | undefined;
  llmNarrative?: string | undefined;
};

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

export function validateAgentCoreBody(body: Record<string, unknown>) {
  if (!Object.keys(body).length) return "Request body is required";
  const hasLaunchPlan = Boolean(stringField(body, "launchPlanId"));
  const hasSourcePair = Boolean(stringField(body, "sourceEntityType") && stringField(body, "sourceEntityId"));
  if (!hasLaunchPlan && !hasSourcePair) return "launchPlanId or sourceEntityType/sourceEntityId is required";
  return "";
}

export function agentCoreBody(body: Record<string, unknown>): AgentCoreBody {
  return {
    sourceEntityType: stringField(body, "sourceEntityType") || undefined,
    sourceEntityId: stringField(body, "sourceEntityId") || undefined,
    launchPlanId: stringField(body, "launchPlanId") || undefined,
    content: stringField(body, "content") || undefined,
    suggestedRewrite: stringField(body, "suggestedRewrite") || undefined,
    llmNarrative: stringField(body, "llmNarrative") || undefined
  };
}

export function agentCoreFailureStatus(code: string) {
  if (code === "unauthenticated") return 401;
  if (code === "forbidden" || code === "workspace_access_denied") return 403;
  if (code === AGENT_CORE_SOURCE_REQUIRED || code === COMMERCE_AGENT_INVALID_JSON || code === COMMERCE_AGENT_INVALID_BODY) return 400;
  if (code === AGENT_CORE_SOURCE_NOT_FOUND) return 404;
  return shopManagerFailureStatus(code);
}

export async function executeAgentCorePost(req: Request, fn: (input: AgentCoreBody & {
  repos: RepositoryBundle;
  workspaceId: string;
  actorId: string;
}) => Promise<unknown>) {
  try {
    const user = await requireDraftMutationPermission(req, shopManagerWorkspaceId);
    const parsed = asRecord(await readJsonOrFormBody(req));
    const validationError = validateAgentCoreBody(parsed);
    if (validationError) return badRequest(validationError);
    const repos = createRepositories();
    const output = await fn({
      repos,
      workspaceId: shopManagerWorkspaceId,
      actorId: user.id,
      ...agentCoreBody(parsed)
    });
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    const code = error instanceof Error && error.message ? error.message : "agent_core_failed";
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status: number }).status) : agentCoreFailureStatus(code);
    return NextResponse.json({ ok: false, status: "blocked", code, message: code }, { status });
  }
}

export async function executeAgentCoreBundleGet(req: Request, fn: (input: AgentCoreBody & {
  repos: RepositoryBundle;
  workspaceId: string;
}) => Promise<unknown>) {
  try {
    await requireWorkspaceMember(req, shopManagerWorkspaceId);
    const url = new URL(req.url);
    const body = {
      sourceEntityType: url.searchParams.get("sourceEntityType") ?? "",
      sourceEntityId: url.searchParams.get("sourceEntityId") ?? "",
      launchPlanId: url.searchParams.get("launchPlanId") ?? ""
    };
    const validationError = validateAgentCoreBody(body);
    if (validationError) return badRequest(validationError);
    const output = await fn({
      repos: createRepositories(),
      workspaceId: shopManagerWorkspaceId,
      ...agentCoreBody(body)
    });
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    const code = error instanceof Error && error.message ? error.message : "agent_core_failed";
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status: number }).status) : agentCoreFailureStatus(code);
    return NextResponse.json({ ok: false, status: "blocked", code, message: code }, { status });
  }
}
