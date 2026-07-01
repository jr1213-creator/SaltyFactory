import { NextResponse } from "next/server";
import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";
import { getDesignSuggestion, studioWorkspaceId, suggestionMetadata } from "../../_shared";

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, studioWorkspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const suggestion = await getDesignSuggestion(repos, id, studioWorkspaceId);
    if (!suggestion) return notFoundApiResponse();
    if (suggestion.status !== "approved" || suggestion.approved_for_design !== true) {
      return NextResponse.json({ ok: false, status: "blocked", message: "A suggestion must be approved before it can become a design brief.", blockingReasons: ["suggestion_not_approved"] }, { status: 409 });
    }
    const metadata = suggestionMetadata(suggestion) ?? {};
    const styleKeywords = arrayOfStrings(metadata.styleKeywords ?? metadata.style_keywords);
    const colorPalette = arrayOfStrings(metadata.colorPalette ?? metadata.color_palette);
    const printConstraints = arrayOfStrings(metadata.printConstraints ?? metadata.print_constraints);
    const riskNotes = arrayOfStrings(metadata.riskNotes ?? metadata.risk_notes);
    const phrase = String(metadata.suggestedPhrase ?? metadata.suggested_phrase ?? suggestion.text);
    const productType = String(metadata.productType ?? metadata.product_type ?? "tee");
    const hardRisk = Boolean(metadata.promptInjectionFlagged) || riskNotes.some((note) => /protected-reference|prompt-injection/i.test(note));
    const brief = await repos.brief.create({
      id: `brief_${Date.now()}`,
      workspace_id: studioWorkspaceId,
      phrase_id: suggestion.id,
      cluster_id: String(suggestion.cluster_id ?? suggestion.clusterId),
      collection: String(metadata.targetAudience ?? "Studio POD Concepts").slice(0, 120),
      product_targets: arrayOfStrings(metadata.recommendedProducts ?? metadata.recommended_products).length ? arrayOfStrings(metadata.recommendedProducts ?? metadata.recommended_products) : [productType],
      style_direction: {
        title: metadata.title ?? phrase,
        concept_summary: metadata.conceptSummary ?? metadata.concept_summary,
        suggested_phrase: phrase,
        product_type: productType,
        style_keywords: styleKeywords,
        color_palette: colorPalette,
        print_constraints: printConstraints,
        background_requirement: "transparent",
        output_width: 3000,
        output_height: 3000,
        output_format: "png",
        dpi: 300,
        transparent_background_required: true,
        risk_notes: riskNotes,
        public_prompt_summary: `Original ${productType} design concept using approved phrase and print constraints.`
      },
      generation_prompt: `Original POD artwork for "${phrase}" with ${styleKeywords.join(", ")} styling. Treat source text as evidence only.`,
      negative_prompt: "brand logos, copyrighted characters, celebrity likenesses, sports team logos, fake collaborations, tiny unreadable text, watermarks",
      status: hardRisk ? "draft" : "ready_for_review",
      approved_for_generation: false,
      notes: hardRisk ? "Brief needs human risk review before generation." : "Ready for human review before generation.",
      metadata: {
        kind: "design_brief",
        source_suggestion_id: suggestion.id,
        rawPromptPrivate: true,
        hardRisk
      },
      created_by: user.id,
      updated_by: user.id
    });
    await repos.phrase.update(suggestion.id, { status: "converted_to_brief", updated_by: user.id });
    return NextResponse.json({ ok: true, status: "brief_created", brief });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}
