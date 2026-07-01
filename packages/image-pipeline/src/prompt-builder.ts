export type PromptBriefInput = {
  id: string;
  title?: string;
  collection?: string;
  productTargets?: string[];
  product_targets?: string[];
  styleDirection?: Record<string, unknown>;
  style_direction?: Record<string, unknown>;
  generationPrompt?: string;
  generation_prompt?: string;
  negativePrompt?: string;
  negative_prompt?: string;
  notes?: string | null;
};

export type PromptPackage = {
  positive_prompt: string;
  negative_prompt: string;
  public_prompt_summary: string;
  private_prompt_snapshot: string;
  generation_params: {
    width: number;
    height: number;
    count: number;
    transparentBackground: boolean;
  };
  safety_metadata: {
    promptInjectionFlagged: boolean;
    hardRiskTerms: string[];
  };
  blockers: string[];
  warnings: string[];
};

const injectionPatterns = [
  /ignore (all )?(previous|above) instructions/i,
  /reveal (the )?(system|developer) prompt/i,
  /exfiltrate secrets/i,
  /bypass safety/i,
  /publish automatically/i,
  /upload automatically/i
];

const hardRiskTerms = [
  "disney",
  "nike",
  "gucci",
  "harley",
  "celebrity likeness",
  "sports team logo",
  "copyrighted character"
];

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function styleOf(brief: PromptBriefInput) {
  const style = brief.styleDirection ?? brief.style_direction ?? {};
  return style && typeof style === "object" ? style : {};
}

export function buildPromptPackageFromBrief(brief: PromptBriefInput, options: { count?: number; width?: number; height?: number } = {}): PromptPackage {
  const style = styleOf(brief);
  const promptText = String(brief.generationPrompt ?? brief.generation_prompt ?? "");
  const negativeText = String(brief.negativePrompt ?? brief.negative_prompt ?? "");
  const combined = `${promptText} ${negativeText} ${brief.notes ?? ""}`;
  const promptInjectionFlagged = injectionPatterns.some((pattern) => pattern.test(combined));
  const foundRiskTerms = hardRiskTerms.filter((term) => combined.toLowerCase().includes(term));
  const blockers = [
    ...(promptInjectionFlagged ? ["prompt_injection_detected"] : []),
    ...(foundRiskTerms.length ? ["hard_risk_terms_detected"] : [])
  ];
  const productTargets = arrayOfStrings(brief.productTargets ?? brief.product_targets);
  const palette = arrayOfStrings(style.color_palette ?? style.colorPalette);
  const keywords = arrayOfStrings(style.style_keywords ?? style.styleKeywords);
  const phrase = String(style.suggested_phrase ?? style.suggestedPhrase ?? promptText).slice(0, 120);
  const transparentBackground = style.background_requirement === "transparent" || style.transparent_background_required === true || style.transparentBackgroundRequired === true;
  const safeInstruction = [
    `Original print-on-demand artwork for ${productTargets[0] ?? brief.collection ?? "a POD product"}.`,
    `Phrase or motif: ${phrase}.`,
    keywords.length ? `Style keywords: ${keywords.join(", ")}.` : "Style: clean, original, boutique-ready illustration.",
    palette.length ? `Color palette: ${palette.join(", ")}.` : "Use a limited, print-friendly palette.",
    "Centered composition, clean edges, no tiny unreadable text, no brand logos, no celebrity likenesses, no copyrighted characters.",
    transparentBackground ? "Transparent background source art." : "Background may be contextual only if requested by the human brief."
  ].join(" ");
  const negative = [
    negativeText,
    "brand logos, copyrighted characters, celebrity likeness, sports team logos, fake collaborations, tiny unreadable text, low resolution, watermarks"
  ].filter(Boolean).join(", ");

  return {
    positive_prompt: safeInstruction,
    negative_prompt: negative,
    public_prompt_summary: `Original ${productTargets[0] ?? "POD"} concept for ${brief.collection ?? "Studio"} using human-reviewed style and print constraints.`,
    private_prompt_snapshot: JSON.stringify({
      briefId: brief.id,
      sourcePrompt: promptText,
      sourceNegativePrompt: negativeText,
      styleDirection: style,
      createdAt: new Date().toISOString()
    }),
    generation_params: {
      width: Number(options.width ?? style.output_width ?? style.outputWidth ?? 3000),
      height: Number(options.height ?? style.output_height ?? style.outputHeight ?? 3000),
      count: Math.min(Math.max(Number(options.count ?? 1), 1), 4),
      transparentBackground
    },
    safety_metadata: { promptInjectionFlagged, hardRiskTerms: foundRiskTerms },
    blockers,
    warnings: transparentBackground ? [] : ["transparent_background_not_required"]
  };
}
