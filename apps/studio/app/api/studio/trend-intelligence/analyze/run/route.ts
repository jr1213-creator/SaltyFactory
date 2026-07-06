import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories } from "@saltyfactory/db";
import {
  ensureTrendAnalysisReportDraft,
  findTrendAnalysisReportByAgentRunId,
  getTrendAnalysisReportDetail,
  NO_TREND_SIGNALS_AVAILABLE,
  readPersistedTrendSignals,
  runLocalOllamaAgentTask,
  enqueueLocalOllamaAgentRun
} from "@saltyfactory/ai-free";
import { sanitizeProviderError } from "@saltyfactory/security";
import { studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

const id = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function failureStatusCode(errorCode: string | undefined, status: "completed" | "blocked" | "failed" | "incomplete") {
  if (errorCode === NO_TREND_SIGNALS_AVAILABLE) return 409;
  if (errorCode === "unknown_agent_role" || errorCode === "unsupported_agent_task_type") return 400;
  if (errorCode === "agent_daily_limit_exceeded") return 429;
  if (errorCode === "agent_queue_unavailable" || errorCode === "ollama_unavailable" || status === "blocked") return 503;
  return 500;
}

function analysisInstructions() {
  return "Analyze persisted trend signals only. Cluster them, score them transparently, and draft grounded product concept candidates for owner review. Do not create product drafts, creative briefs, images, or provider mutations.";
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const profileId = typeof body.profileId === "string" ? body.profileId : "";
    const sourceKeys = Array.isArray(body.sourceKeys) ? body.sourceKeys.map(String) : undefined;
    const maxSignals = Number.isFinite(Number(body.maxSignals)) ? Number(body.maxSignals) : 100;
    const maxConcepts = Number.isFinite(Number(body.maxConcepts)) ? Number(body.maxConcepts) : 8;
    const dryRun = body.dryRun === true;
    const repos = createRepositories();
    const config = parseEnv();

    if (!profileId) {
      return NextResponse.json({ ok: false, status: "blocked", errorCode: "trend_profile_missing", message: "Trend watch profile ID is required." }, { status: 400 });
    }

    const persisted = await readPersistedTrendSignals({
      repos,
      workspaceId,
      profileId,
      sourceKeys,
      maxSignals
    });
    if (!persisted.signalCount) {
      return NextResponse.json({
        ok: false,
        status: "blocked",
        errorCode: NO_TREND_SIGNALS_AVAILABLE,
        message: "No persisted trend signals are available for this profile and source selection."
      }, { status: 409 });
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        status: "dry_run",
        profileId,
        signalCount: persisted.signalCount,
        maxSignals,
        maxConcepts,
        sourceKeys: sourceKeys ?? []
      });
    }

    if (config.AI_EMPLOYEES_AGENT_EXECUTION_MODE === "inline_test") {
      const agentRunId = id("agent_run");
      const report = await ensureTrendAnalysisReportDraft({
        repos,
        workspaceId,
        actorId: user.id,
        profileId,
        agentRunId
      });
      const result = await runLocalOllamaAgentTask({
        repos,
        workspaceId,
        actorId: user.id,
        roleKey: "trend_intelligence_agent",
        taskType: "analyze_trend_profile",
        agentRunId,
        taskInput: {
          profileId,
          ...(sourceKeys?.length ? { sourceKeys } : {}),
          maxSignals,
          maxConcepts,
          instructions: analysisInstructions()
        }
      });
      const savedReport = await findTrendAnalysisReportByAgentRunId({ repos, workspaceId, agentRunId });
      if (!result.ok) {
        return NextResponse.json({
          ok: false,
          status: result.status,
          profileId,
          agentRunId: result.agentRunId,
          reportId: savedReport?.id ?? report.id,
          blockingReason: result.blockingReason,
          errorCode: result.errorCode,
          message: result.blockingReason === "ollama_unavailable"
            ? "Local Ollama is not available. Start Ollama and configure the local model."
            : "The Trend Intelligence Agent did not complete.",
          requiresHumanReview: true
        }, { status: failureStatusCode(result.errorCode, result.status) });
      }
      const detail = savedReport ? await getTrendAnalysisReportDetail({ repos, workspaceId, reportId: savedReport.id }) : null;
      return NextResponse.json({
        ok: true,
        status: result.status,
        profileId,
        agentRunId: result.agentRunId,
        reportId: savedReport?.id ?? report.id,
        signalCount: detail?.report.sourceSignalCount ?? persisted.signalCount,
        clusterCount: detail?.report.clusterCount ?? 0,
        conceptCandidateCount: detail?.report.conceptCandidateCount ?? 0,
        topConceptTitles: detail?.conceptCandidates.map((candidate) => candidate.title).slice(0, 8) ?? [],
        requiresHumanReview: true
      });
    }

    const queued = await enqueueLocalOllamaAgentRun({
      repos,
      workspaceId,
      actorId: user.id,
      roleKey: "trend_intelligence_agent",
      taskType: "analyze_trend_profile",
      taskInput: {
        profileId,
        ...(sourceKeys?.length ? { sourceKeys } : {}),
        maxSignals,
        maxConcepts,
        instructions: analysisInstructions()
      }
    });

    if (!queued.ok) {
      return NextResponse.json({
        ok: false,
        status: queued.status,
        ...(queued.agentRunId ? { agentRunId: queued.agentRunId } : {}),
        blockingReason: queued.blockingReason ?? null,
        errorCode: queued.errorCode ?? null,
        message: queued.errorCode === "agent_daily_limit_exceeded"
          ? "Daily AI employee run limit reached for this workspace."
          : queued.errorCode === "agent_queue_unavailable"
            ? "Agent queue is unavailable. Start the worker and try again."
            : queued.message,
        requiresHumanReview: true
      }, { status: failureStatusCode(queued.errorCode, queued.status) });
    }

    const report = await ensureTrendAnalysisReportDraft({
      repos,
      workspaceId,
      actorId: user.id,
      profileId,
      agentRunId: queued.agentRunId
    });

    return NextResponse.json({
      ok: true,
      status: "queued",
      profileId,
      agentRunId: queued.agentRunId,
      reportId: report.id,
      nextAction: "poll_transcript",
      transcriptUrl: `/api/studio/ai-employees/agent-runs/${queued.agentRunId}/transcript`,
      reportUrl: `/api/studio/trend-intelligence/analysis-reports/${report.id}`,
      requiresHumanReview: true
    });
  } catch (error) {
    try {
      return studioAuthErrorResponse(error);
    } catch {
      return NextResponse.json({ ok: false, status: "failed", message: sanitizeProviderError(error) }, { status: 500 });
    }
  }
}
