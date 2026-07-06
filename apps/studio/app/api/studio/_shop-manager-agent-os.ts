import { NextResponse } from "next/server";
import { createRepositories } from "@saltyfactory/db";
import {
  COMMERCE_AGENT_INVALID_BODY,
  COMMERCE_AGENT_INVALID_JSON,
  COMMERCE_AGENT_INVALID_DECISION,
  COMMERCE_AGENT_ROLE_DISABLED,
  COMMERCE_AGENT_ROLE_UNKNOWN,
  commerceAgentRoleKeys,
  registerCommerceAgentRoles,
  runCommerceAgent,
  runLocalOllamaAgentTask
} from "@saltyfactory/ai-free";

export const shopManagerWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

export async function readJsonOrFormBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      throw new Error(COMMERCE_AGENT_INVALID_JSON);
    }
  }
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

export function safeStudioRedirect(req: Request, next: unknown, fallback = "/studio/shop-manager") {
  const value = String(next ?? "").trim();
  if (!value || !value.startsWith("/studio/") || value.includes("//")) return null;
  return new URL(value.replace("{id}", encodeURIComponent(fallback)), req.url);
}

export function shopManagerFailureStatus(code: string) {
  if (code === COMMERCE_AGENT_INVALID_JSON || code === COMMERCE_AGENT_INVALID_BODY) return 400;
  if (code === COMMERCE_AGENT_INVALID_DECISION) return 400;
  if (code === COMMERCE_AGENT_ROLE_UNKNOWN) return 404;
  if (code === COMMERCE_AGENT_ROLE_DISABLED) return 409;
  if (code === "approval_queue_empty") return 409;
  return 500;
}

export function badRequest(message: string) {
  return NextResponse.json({ ok: false, status: "blocked", message }, { status: 400 });
}

export function roleFromBody(body: Record<string, unknown>, fallback = "owner_daily_brief") {
  const rawRoleKey = body["roleKey"];
  const roleKey = typeof rawRoleKey === "string" ? rawRoleKey.trim() : fallback;
  return commerceAgentRoleKeys.includes(roleKey) ? roleKey : "";
}

export function stringField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function validateShopManagerRunBody(body: Record<string, unknown>) {
  if (!Object.keys(body).length) return "Request body is required";
  const roleKey = stringField(body, "roleKey");
  const runIntent = stringField(body, "runIntent");
  if (roleKey && !commerceAgentRoleKeys.includes(roleKey)) return "Valid roleKey is required";
  if (!roleKey && runIntent !== "shop_manager_brief") return "runIntent or valid roleKey is required";
  return "";
}

export function validateBehavioralConsultationBody(body: Record<string, unknown>) {
  if (!Object.keys(body).length) return "Request body is required";
  const hasContext = Boolean(stringField(body, "content") || stringField(body, "audienceContext"));
  const hasSourcePair = Boolean(stringField(body, "sourceEntityType") && stringField(body, "sourceEntityId"));
  const hasLaunchPlan = Boolean(stringField(body, "launchPlanId"));
  if (!hasContext) return "content or audienceContext is required";
  if (!hasLaunchPlan && !hasSourcePair) return "launchPlanId or sourceEntityType/sourceEntityId is required";
  return "";
}

export async function executeCommerceAgentRoute(input: {
  body: Record<string, unknown>;
  actorId: string;
  roleKey: string;
  forceOllama?: boolean | undefined;
}) {
  if (!commerceAgentRoleKeys.includes(input.roleKey)) throw new Error(COMMERCE_AGENT_ROLE_UNKNOWN);
  if (input.roleKey === "behavioral_psychology_customer_empathy") {
    const validationError = validateBehavioralConsultationBody(input.body);
    if (validationError) throw new Error(COMMERCE_AGENT_INVALID_BODY);
  }
  const repos = createRepositories();
  await registerCommerceAgentRoles({ repos, workspaceId: shopManagerWorkspaceId, actorId: input.actorId });
  const taskInput = {
    sourceEntityType: typeof input.body.sourceEntityType === "string" ? input.body.sourceEntityType : undefined,
    sourceEntityId: typeof input.body.sourceEntityId === "string" ? input.body.sourceEntityId : undefined,
    launchPlanId: typeof input.body.launchPlanId === "string" ? input.body.launchPlanId : undefined,
    approvalItemId: typeof input.body.approvalItemId === "string" ? input.body.approvalItemId : undefined,
    recommendationId: typeof input.body.recommendationId === "string" ? input.body.recommendationId : undefined,
    content: typeof input.body.content === "string" ? input.body.content : undefined,
    audienceContext: typeof input.body.audienceContext === "string" ? input.body.audienceContext : undefined,
    consultationType: typeof input.body.consultationType === "string" ? input.body.consultationType : undefined,
    instructions: typeof input.body.instructions === "string" ? input.body.instructions : "Use safe internal tools and persist owner-reviewable outputs only."
  };
  const useOllama = input.forceOllama || input.body.runMode === "local_ollama" || process.env.AI_EMPLOYEES_REAL_AGENT_ENABLED === "true";
  let ollamaResult = null as Awaited<ReturnType<typeof runLocalOllamaAgentTask>> | null;
  if (useOllama) {
    ollamaResult = await runLocalOllamaAgentTask({
      repos,
      workspaceId: shopManagerWorkspaceId,
      actorId: input.actorId,
      roleKey: input.roleKey,
      taskType: "run_commerce_agent_os_task",
      taskInput
    });
    if (!ollamaResult.ok) {
      return { repos, ollamaResult, commerceResult: null };
    }
  }
  const commerceResult = await runCommerceAgent({
    repos,
    workspaceId: shopManagerWorkspaceId,
    actorId: input.actorId,
    roleKey: input.roleKey,
    ...taskInput,
    agentRunId: ollamaResult?.agentRunId
  });
  return { repos, ollamaResult, commerceResult };
}
