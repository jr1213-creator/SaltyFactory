import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { createDeterministicDesignSuggestions } from "@saltyfactory/ai-free";
import { studioAuthErrorResponse } from "../_auth";
import { listDesignSuggestions, safeSlug, studioWorkspaceId } from "./_shared";

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, studioWorkspaceId);
    const suggestions = await listDesignSuggestions(createRepositories(), studioWorkspaceId);
    return NextResponse.json({ ok: true, suggestions });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, studioWorkspaceId);
    const body = await req.json().catch(() => ({}));
    const topic = String(body.topic || body.niche || "").trim();
    if (topic.length < 3) {
      return NextResponse.json({ ok: false, status: "invalid_request", message: "Manual topic or niche is required." }, { status: 400 });
    }
    const repos = createRepositories();
    const drafts = createDeterministicDesignSuggestions({ topic });
    const now = Date.now();
    const cluster = await repos.cluster.create({
      id: `cluster_manual_${now}`,
      workspace_id: studioWorkspaceId,
      name: `Manual topic: ${topic.slice(0, 90)}`,
      signal_ids: [],
      keywords: topic.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 12),
      aesthetic_tags: drafts[0]?.styleKeywords ?? [],
      seasonality: [],
      target_customer: drafts[0]?.targetAudience ?? "POD shoppers",
      confidence: "0.7600",
      status: "suggested",
      approved_for_generation: false,
      notes: "Created from a manual Studio topic. This is not scraped trend data.",
      metadata: {
        kind: "manual_design_topic",
        topic,
        source: "manual_user_input",
        promptInjectionFlagged: drafts.some((draft) => draft.promptInjectionFlagged)
      },
      created_by: user.id,
      updated_by: user.id
    });
    const suggestions = [];
    for (const [index, draft] of drafts.entries()) {
      const phrase = await repos.phrase.create({
        id: `suggestion_${now}_${index}`,
        workspace_id: studioWorkspaceId,
        cluster_id: cluster.id,
        text: draft.suggestedPhrase,
        generated_by: "deterministic_design_suggestion_engine",
        generation_prompt_ref: `manual-topic:${safeSlug(topic)}`,
        status: "suggested",
        trademark_review: {
          status: draft.scores.risk > 40 ? "needs_review" : "low_initial_risk",
          notes: draft.riskNotes
        },
        approved_for_design: false,
        notes: draft.riskNotes.join(" "),
        metadata: { kind: "design_suggestion", ...draft },
        created_by: user.id,
        updated_by: user.id
      });
      suggestions.push(phrase);
    }
    return NextResponse.json({
      ok: true,
      status: "suggestions_created",
      cluster,
      suggestions: await listDesignSuggestions(repos, studioWorkspaceId)
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
