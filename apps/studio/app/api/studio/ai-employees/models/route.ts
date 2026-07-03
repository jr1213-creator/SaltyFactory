import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, type WorkspaceRow } from "@saltyfactory/db";
import {
  ensureDefaultModelRuntimeRecords,
  sanitizeModel,
  sanitizeModelProvider
} from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function readBody(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return await req.json().catch(() => ({}));
  if (contentType.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  return {};
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    const repos = createRepositories();
    await ensureDefaultModelRuntimeRecords(workspaceId, repos);
    const providers = await repos.aiModelRuntime.providers.listByWorkspace(workspaceId);
    const providerIds = new Set(providers.map((provider) => provider.id));
    const models = (await repos.aiModelRuntime.models.list()).filter((model) => providerIds.has(String(model.provider_id ?? model.providerId)));
    const assignments = await repos.aiModelRuntime.assignments.list();
    return NextResponse.json({
      ok: true,
      providers: providers.map(sanitizeModelProvider),
      models: models.map(sanitizeModel),
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        employee_id: assignment.employee_id ?? assignment.employeeId,
        default_model_id: assignment.default_model_id ?? assignment.defaultModelId,
        fallback_model_id: assignment.fallback_model_id ?? assignment.fallbackModelId ?? null,
        escalation_model_id: assignment.escalation_model_id ?? assignment.escalationModelId ?? null,
        allowed_task_types: assignment.allowed_task_types ?? assignment.allowedTaskTypes ?? [],
        forbidden_task_types: assignment.forbidden_task_types ?? assignment.forbiddenTaskTypes ?? [],
        max_risk_level: assignment.max_risk_level ?? assignment.maxRiskLevel,
        requires_owner_approval_for_escalation: assignment.requires_owner_approval_for_escalation ?? assignment.requiresOwnerApprovalForEscalation
      }))
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await readBody(req);
    const repos = createRepositories();
    await ensureDefaultModelRuntimeRecords(workspaceId, repos);
    const providerKey = String(body.providerKey || body.provider_key || "ollama");
    const displayName = String(body.displayName || body.display_name || `${providerKey} model runtime`);
    const providerType = String(body.providerType || body.provider_type || "local");
    const baseUrl = String(body.baseUrl || body.base_url || "");
    const existing = (await repos.aiModelRuntime.providers.listByWorkspace(workspaceId)).find((provider) =>
      String(provider.provider_key ?? provider.providerKey) === providerKey
    );
    const providerPatch: Partial<WorkspaceRow> = {
      display_name: displayName,
      provider_type: providerType,
      base_url: baseUrl || null,
      enabled: body.enabled === "true" || body.enabled === true,
      configured_status: body.configuredStatus || body.configured_status || "not_configured",
      supports_json: body.supportsJson === "false" || body.supports_json === "false" ? false : true,
      supports_tools: body.supportsTools === "true" || body.supports_tools === "true",
      supports_vision: body.supportsVision === "true" || body.supports_vision === "true",
      supports_long_context: body.supportsLongContext === "true" || body.supports_long_context === "true",
      cost_tier: body.costTier || body.cost_tier || (providerType === "local" ? "free_local" : "low"),
      data_sensitivity_allowed: body.dataSensitivityAllowed || body.data_sensitivity_allowed || "business_internal",
      updated_by: user.id
    };
    const provider = existing
      ? await repos.aiModelRuntime.providers.update(existing.id, providerPatch)
      : await repos.aiModelRuntime.providers.create({
        id: id("model_provider"),
        workspace_id: workspaceId,
        provider_key: providerKey,
        created_by: user.id,
        ...providerPatch
      } as WorkspaceRow);

    const modelKey = String(body.modelKey || body.model_key || "");
    let model: WorkspaceRow | null = null;
    if (modelKey) {
      model = await repos.aiModelRuntime.models.create({
        id: id("model"),
        workspace_id: workspaceId,
        provider_id: provider.id,
        model_key: modelKey,
        display_name: String(body.modelDisplayName || body.model_display_name || modelKey),
        model_family: body.modelFamily || body.model_family || null,
        task_strengths: ["drafting", "classification"],
        weaknesses: ["No autonomous provider actions", "Owner review required"],
        context_window: Number(body.contextWindow || body.context_window || 8192),
        recommended_for: ["classify_blocker", "summarize_status", "draft_task", "draft_improvement_suggestion"],
        forbidden_for: ["publish", "spend", "send", "sync", "delete", "bank_connect", "use_ein", "provider_credentials", "external_order", "submit_application"],
        status: String(body.modelStatus || body.model_status || "candidate"),
        cost_estimate: { tier: providerPatch.cost_tier },
        rate_limit_estimate: {},
        eval_score: {}
      } as WorkspaceRow);
    }
    return NextResponse.json({
      ok: true,
      status: model ? "model_registered" : "provider_registered",
      provider: sanitizeModelProvider(provider),
      model: model ? sanitizeModel(model) : null
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
