import { NextResponse } from "next/server";
import { requireDraftMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../_auth";
import { studioWorkspaceId } from "../design-suggestions/_shared";

function cleanText(value: unknown, fallback = "") {
  return String(value || fallback).trim();
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, studioWorkspaceId);
    const briefs = await createRepositories().brief.listByWorkspace(studioWorkspaceId);
    return NextResponse.json({ ok: true, briefs });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireDraftMutationPermission(req, studioWorkspaceId);
    const body = await req.json().catch(() => ({}));
    const title = cleanText(body.title, "Manual POD Design Brief");
    const phraseText = cleanText(body.phrase_text ?? body.phraseText, title);
    const productType = cleanText(body.product_type ?? body.productType, "tee");
    const artDirection = cleanText(body.art_direction ?? body.artDirection, "Original POD artwork with clean print-ready edges.");
    const now = Date.now();
    const repos = createRepositories();
    const cluster = await repos.cluster.create({
      id: `cluster_manual_brief_${now}`,
      workspace_id: studioWorkspaceId,
      name: `Manual brief: ${title.slice(0, 90)}`,
      signal_ids: [],
      keywords: phraseText.toLowerCase().split(/\s+/).slice(0, 12),
      aesthetic_tags: [],
      seasonality: [],
      target_customer: cleanText(body.target_audience ?? body.targetAudience, "POD shoppers"),
      confidence: "0.7000",
      status: "manual_brief_source",
      approved_for_generation: false,
      notes: "Internal source row for a manually-created design brief.",
      metadata: { kind: "manual_brief_source" },
      created_by: user.id,
      updated_by: user.id
    });
    const phrase = await repos.phrase.create({
      id: `phrase_manual_brief_${now}`,
      workspace_id: studioWorkspaceId,
      cluster_id: cluster.id,
      text: phraseText,
      generated_by: "manual_design_brief",
      generation_prompt_ref: `manual-brief:${cluster.id}`,
      status: "approved",
      trademark_review: { status: "needs_human_review" },
      approved_for_design: true,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      notes: "Manual phrase created as design brief source.",
      metadata: { kind: "manual_brief_phrase" },
      created_by: user.id,
      updated_by: user.id
    });
    const brief = await repos.brief.create({
      id: `brief_${now}`,
      workspace_id: studioWorkspaceId,
      phrase_id: phrase.id,
      cluster_id: cluster.id,
      collection: cleanText(body.collection, "Manual POD Briefs"),
      product_targets: [productType],
      style_direction: {
        title,
        suggested_phrase: phraseText,
        product_type: productType,
        art_direction: artDirection,
        typography_direction: cleanText(body.typography_direction ?? body.typographyDirection, "Readable POD-safe lettering"),
        color_palette: Array.isArray(body.color_palette) ? body.color_palette : [],
        background_requirement: cleanText(body.background_requirement ?? body.backgroundRequirement, "transparent"),
        output_width: Number(body.output_width ?? body.outputWidth ?? 3000),
        output_height: Number(body.output_height ?? body.outputHeight ?? 3000),
        output_format: "png",
        dpi: 300,
        transparent_background_required: true,
        public_prompt_summary: `Original ${productType} design brief with human-provided art direction.`
      },
      generation_prompt: `${artDirection} Phrase or motif: ${phraseText}.`,
      negative_prompt: "brand logos, copyrighted characters, celebrity likenesses, sports team logos, fake collaborations, tiny unreadable text, watermarks",
      status: "draft",
      approved_for_generation: false,
      notes: "Manual brief awaiting human approval.",
      metadata: { kind: "design_brief", rawPromptPrivate: true, source: "manual" },
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "brief_created", brief });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
