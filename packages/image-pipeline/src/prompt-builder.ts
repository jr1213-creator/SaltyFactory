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

export type DetectedPromptSafetyTerm = {
  term: string;
  category: string;
  severity: "blocker" | "warning";
  reason: string;
};

export type PromptSafetyResult = {
  blockers: string[];
  warnings: string[];
  detected_terms: DetectedPromptSafetyTerm[];
  safe_to_approve: boolean;
  safe_to_generate: boolean;
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
    detectedTerms: DetectedPromptSafetyTerm[];
    safeToApprove: boolean;
    safeToGenerate: boolean;
  };
  blockers: string[];
  warnings: string[];
  detected_terms: DetectedPromptSafetyTerm[];
  safe_to_approve: boolean;
  safe_to_generate: boolean;
};

export type PodStylePreset = {
  id: string;
  label: string;
  promptAdditions: string[];
  negativePromptAdditions: string[];
  defaultDimensions: { width: number; height: number };
  suggestedPrintTargets: string[];
  styleTags: string[];
};

export type PodPromptRecipe = {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  guidanceScale: number;
  numInferenceSteps: number;
  seed: number | null;
  printTarget: string;
  stylePreset: string;
  safetyNotes: string[];
  textRequested: boolean;
  basePackage: PromptPackage;
};

export const defaultPodNegativePrompt = "blurry, low resolution, distorted text, misspelled words, extra letters, warped letters, cropped design, watermark, logo, signature, mockup, t-shirt photo, product photo, human model, hands, face, bad anatomy, noisy background, cluttered background";

export const podStylePresets: PodStylePreset[] = [
  { id: "coastal_cowgirl", label: "Coastal Cowgirl", promptAdditions: ["boutique western coastal style", "coral and turquoise accents", "sun-faded premium apparel graphic"], negativePromptAdditions: ["cheap clip art", "muddy colors"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square", "tote_front"], styleTags: ["coastal", "western", "feminine"] },
  { id: "western_luxe", label: "Western Luxe", promptAdditions: ["premium western boutique design", "refined leather and ranch-inspired detailing", "polished high-end print artwork"], negativePromptAdditions: ["cartoonish", "messy layout"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square"], styleTags: ["western", "premium"] },
  { id: "retro_rodeo", label: "Retro Rodeo", promptAdditions: ["retro rodeo poster energy", "vintage screenprint feel", "bold readable composition"], negativePromptAdditions: ["modern tech style", "photorealistic shirt"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square", "sticker_square"], styleTags: ["retro", "rodeo"] },
  { id: "surf_ranch", label: "Surf Ranch", promptAdditions: ["coastal surf ranch mood", "weathered beach rodeo palette", "relaxed premium apparel graphic"], negativePromptAdditions: ["corporate", "neon overload"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square"], styleTags: ["surf", "ranch"] },
  { id: "minimal_boutique", label: "Minimal Boutique", promptAdditions: ["minimal boutique graphic", "clean negative space", "elegant simple linework"], negativePromptAdditions: ["crowded", "overly detailed"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square", "tote_front"], styleTags: ["minimal", "boutique"] },
  { id: "sticker_pack", label: "Sticker Pack", promptAdditions: ["sticker-ready isolated graphic", "bold outline", "compact collectible design"], negativePromptAdditions: ["thin fragile lines", "background scene"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["sticker_square"], styleTags: ["sticker", "bold"] },
  { id: "kids_tee", label: "Kids Tee", promptAdditions: ["playful kid-friendly apparel graphic", "simple shapes", "soft cheerful color accents"], negativePromptAdditions: ["scary", "adult slogan"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square"], styleTags: ["kids", "playful"] },
  { id: "holiday_drop", label: "Holiday Drop", promptAdditions: ["seasonal holiday drop artwork", "giftable boutique design", "festive but not cluttered"], negativePromptAdditions: ["licensed characters", "brand logos"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square", "mug_wrap"], styleTags: ["holiday", "seasonal"] },
  { id: "monoline", label: "Monoline", promptAdditions: ["single-weight monoline illustration", "clean scalable line art", "premium minimal composition"], negativePromptAdditions: ["messy shading", "photorealism"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square"], styleTags: ["linework", "minimal"] },
  { id: "vintage_distressed", label: "Vintage Distressed", promptAdditions: ["vintage distressed print texture", "screenprint-inspired wear", "heritage apparel graphic"], negativePromptAdditions: ["digital gloss", "3d render"], defaultDimensions: { width: 1024, height: 1024 }, suggestedPrintTargets: ["apparel_front_square"], styleTags: ["vintage", "distressed"] }
];

type SafetyRule = {
  term: string;
  category: string;
  severity: "blocker" | "warning";
  reason: string;
  pattern: RegExp;
};

const injectionRules: SafetyRule[] = [
  { term: "ignore previous instructions", category: "prompt_injection", severity: "blocker", reason: "Prompt injection attempts are never treated as design instructions.", pattern: /ignore (all )?(previous|above) instructions/i },
  { term: "reveal system prompt", category: "prompt_injection", severity: "blocker", reason: "Requests to reveal system or developer prompts are blocked.", pattern: /reveal (the )?(system|developer) prompt/i },
  { term: "exfiltrate secrets", category: "prompt_injection", severity: "blocker", reason: "Requests to access or exfiltrate secrets are blocked.", pattern: /exfiltrate secrets?/i },
  { term: "bypass safety", category: "prompt_injection", severity: "blocker", reason: "Requests to bypass safety are blocked.", pattern: /bypass safety/i },
  { term: "publish automatically", category: "prompt_injection", severity: "blocker", reason: "Automated publishing instructions are blocked.", pattern: /publish automatically/i },
  { term: "upload automatically", category: "prompt_injection", severity: "blocker", reason: "Automated upload instructions are blocked.", pattern: /upload automatically/i }
];

const protectedRules: SafetyRule[] = [
  { term: "Disney", category: "protected_brand", severity: "blocker", reason: "Protected entertainment brand reference.", pattern: /\bdisney\b/i },
  { term: "Mickey Mouse", category: "copyrighted_character", severity: "blocker", reason: "Copyrighted character reference.", pattern: /\bmickey\s+mouse\b|\bmickey\b/i },
  { term: "Barbie", category: "protected_brand", severity: "blocker", reason: "Protected toy/entertainment brand reference.", pattern: /\bbarbie\b/i },
  { term: "Nike", category: "protected_brand", severity: "blocker", reason: "Protected apparel brand reference.", pattern: /\bnike\b/i },
  { term: "Stanley", category: "protected_brand", severity: "blocker", reason: "Protected drinkware brand reference.", pattern: /\bstanley\b/i },
  { term: "Starbucks", category: "protected_brand", severity: "blocker", reason: "Protected coffee brand reference.", pattern: /\bstarbucks\b/i },
  { term: "Taylor Swift", category: "celebrity_or_public_figure", severity: "blocker", reason: "Celebrity/public figure reference.", pattern: /\btaylor\s+swift\b/i },
  { term: "Beyonce", category: "celebrity_or_public_figure", severity: "blocker", reason: "Celebrity/public figure reference.", pattern: /\bbeyonc(?:e|\u00e9)\b/i },
  { term: "Dallas Cowboys", category: "sports_team", severity: "blocker", reason: "Sports team name or logo reference.", pattern: /\bdallas\s+cowboys\b|\bcowboys\s+(logo|team|nfl|football)\b/i },
  { term: "Los Angeles Lakers", category: "sports_team", severity: "blocker", reason: "Sports team name or logo reference.", pattern: /\blos\s+angeles\s+lakers\b|\bla\s+lakers\b|\blakers\b/i },
  { term: "New York Yankees", category: "sports_team", severity: "blocker", reason: "Sports team name or logo reference.", pattern: /\bnew\s+york\s+yankees\b|\byankees\b/i },
  { term: "NFL/NBA/MLB/NHL", category: "sports_league", severity: "blocker", reason: "Sports league marks require licensing.", pattern: /\b(nfl|nba|mlb|nhl|ncaa)\b/i },
  { term: "fake collaboration", category: "fake_collaboration", severity: "blocker", reason: "Fake brand or celebrity collaboration claims are blocked.", pattern: /\b(collab|collaboration|collaborating|partnership)\b[^.]{0,60}\b(disney|barbie|nike|stanley|starbucks|taylor\s+swift|nfl|nba|mlb|nhl)\b/i },
  { term: "in the style of", category: "style_impersonation", severity: "blocker", reason: "Style impersonation of a living artist, public figure, or brand is blocked.", pattern: /\bin the style of\b/i },
  { term: "trademarked slogan", category: "trademarked_phrase", severity: "blocker", reason: "Known protected slogan or phrase.", pattern: /\b(just do it|happiest place on earth|barbiecore|stanley cup)\b/i },
  { term: "offensive/prohibited content", category: "prohibited_content", severity: "blocker", reason: "Offensive or prohibited wording is blocked.", pattern: /\b(fuck|shit|slur)\b/i }
];

const genericDescriptorTerms = [
  "coastal",
  "cowgirl",
  "western",
  "rodeo",
  "beach",
  "salty",
  "boutique",
  "ranch",
  "mama",
  "club",
  "social club",
  "co.",
  "company",
  "vintage",
  "retro",
  "leopard",
  "heart",
  "gulf coast",
  "beach rodeo"
];

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function styleOf(brief: PromptBriefInput) {
  const style = brief.styleDirection ?? brief.style_direction ?? {};
  return style && typeof style === "object" ? style : {};
}

function normalized(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function includesNormalizedPhrase(text: string, term: string) {
  const cleanText = ` ${normalized(text)} `;
  const cleanTerm = normalized(term);
  return cleanTerm.length > 0 && cleanText.includes(` ${cleanTerm} `);
}

function compactUnique<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const itemKey = key(value);
    if (seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}

function detectWorkspaceBrandTerms(text: string, allowedBrandTerms: string[]) {
  return allowedBrandTerms
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && includesNormalizedPhrase(text, term))
    .map((term) => ({
      term,
      category: "workspace_brand",
      severity: "warning" as const,
      reason: "Matches the configured workspace brand term; allowed for this workspace."
    }));
}

export function evaluatePromptSafety(input: { safetyText: string; injectionText?: string; transparentBackground: boolean; allowedBrandTerms?: string[] }): PromptSafetyResult {
  const safetyText = input.safetyText;
  const injectionText = `${input.safetyText} ${input.injectionText ?? ""}`;
  const detected = [
    ...injectionRules.filter((rule) => rule.pattern.test(injectionText)).map(({ pattern: _pattern, ...rule }) => rule),
    ...protectedRules.filter((rule) => rule.pattern.test(safetyText)).map(({ pattern: _pattern, ...rule }) => rule),
    ...genericDescriptorTerms
      .filter((term) => includesNormalizedPhrase(safetyText, term))
      .map((term) => ({
        term,
        category: "generic_pod_descriptor",
        severity: "warning" as const,
        reason: "Generic POD descriptor; allowed but not legal clearance."
      })),
    ...detectWorkspaceBrandTerms(safetyText, input.allowedBrandTerms ?? [])
  ];
  const detectedTerms = compactUnique(detected, (term) => `${term.category}:${term.term.toLowerCase()}`);
  const hasPromptInjection = detectedTerms.some((term) => term.category === "prompt_injection");
  const hasHardRisk = detectedTerms.some((term) => term.severity === "blocker" && term.category !== "prompt_injection");
  const blockers = [
    ...(hasPromptInjection ? ["prompt_injection_detected"] : []),
    ...(hasHardRisk ? ["hard_risk_terms_detected"] : [])
  ];
  const warnings = [
    ...compactUnique(detectedTerms.filter((term) => term.severity === "warning"), (term) => `${term.category}:${term.term.toLowerCase()}`)
      .map((term) => `${term.category}:${term.term}`),
    ...(input.transparentBackground ? [] : ["transparent_background_not_required"])
  ];
  return {
    blockers,
    warnings,
    detected_terms: detectedTerms,
    safe_to_approve: blockers.length === 0,
    safe_to_generate: blockers.length === 0
  };
}

export function buildPromptPackageFromBrief(brief: PromptBriefInput, options: { count?: number; width?: number; height?: number; allowedBrandTerms?: string[] } = {}): PromptPackage {
  const style = styleOf(brief);
  const promptText = String(brief.generationPrompt ?? brief.generation_prompt ?? "");
  const negativeText = String(brief.negativePrompt ?? brief.negative_prompt ?? "");
  const productTargets = arrayOfStrings(brief.productTargets ?? brief.product_targets);
  const palette = arrayOfStrings(style.color_palette ?? style.colorPalette);
  const keywords = arrayOfStrings(style.style_keywords ?? style.styleKeywords);
  const phrase = String(style.suggested_phrase ?? style.suggestedPhrase ?? promptText).slice(0, 120);
  const transparentBackground = style.background_requirement === "transparent" || style.transparent_background_required === true || style.transparentBackgroundRequired === true;
  const safetyText = [
    brief.title,
    brief.collection,
    productTargets.join(" "),
    style.title,
    style.suggested_phrase,
    style.suggestedPhrase,
    style.product_type,
    style.art_direction,
    style.artDirection,
    style.typography_direction,
    style.typographyDirection,
    keywords.join(" "),
    palette.join(" "),
    promptText,
    brief.notes ?? ""
  ].filter(Boolean).join(" ");
  const safetyInput: Parameters<typeof evaluatePromptSafety>[0] = {
    safetyText,
    injectionText: negativeText,
    transparentBackground
  };
  if (options.allowedBrandTerms) safetyInput.allowedBrandTerms = options.allowedBrandTerms;
  const safety = evaluatePromptSafety(safetyInput);
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
    safety_metadata: {
      promptInjectionFlagged: safety.blockers.includes("prompt_injection_detected"),
      hardRiskTerms: safety.detected_terms.filter((term) => term.severity === "blocker").map((term) => term.term),
      detectedTerms: safety.detected_terms,
      safeToApprove: safety.safe_to_approve,
      safeToGenerate: safety.safe_to_generate
    },
    blockers: safety.blockers,
    warnings: safety.warnings,
    detected_terms: safety.detected_terms,
    safe_to_approve: safety.safe_to_approve,
    safe_to_generate: safety.safe_to_generate
  };
}

function presetById(id = "") {
  return podStylePresets.find((preset) => preset.id === id) ?? podStylePresets[0]!;
}

export function buildPodPromptRecipeFromBrief(
  brief: PromptBriefInput,
  options: {
    stylePreset?: string;
    printTarget?: string;
    variantCount?: number;
    width?: number;
    height?: number;
    seed?: number | null;
    negativePrompt?: string;
    guidanceScale?: number;
    numInferenceSteps?: number;
  } = {}
): PodPromptRecipe {
  const preset = presetById(options.stylePreset ?? "coastal_cowgirl");
  const printTarget = options.printTarget ?? preset.suggestedPrintTargets[0] ?? "apparel_front_square";
  const width = Number(options.width ?? preset.defaultDimensions.width);
  const height = Number(options.height ?? preset.defaultDimensions.height);
  const base = buildPromptPackageFromBrief(brief, { count: options.variantCount ?? 4, width, height });
  const style = styleOf(brief);
  const requestedText = String(style.suggested_phrase ?? style.suggestedPhrase ?? "").trim();
  const textRequested = requestedText.length > 0;
  const prompt = [
    "Create a high-resolution print-on-demand artwork design.",
    "Artwork only: centered composition, clean isolated graphic, suitable for DTG printing on apparel and POD products.",
    `Print target: ${printTarget.replace(/_/g, " ")}.`,
    base.positive_prompt,
    `Style preset: ${preset.label}.`,
    `Style details: ${preset.promptAdditions.join(", ")}.`,
    "No product mockup, no model, no watermark, no brand logo, no copyrighted character."
  ].join(" ");
  const negativePrompt = [
    base.negative_prompt,
    defaultPodNegativePrompt,
    ...(options.negativePrompt ? [options.negativePrompt] : []),
    ...preset.negativePromptAdditions
  ].filter(Boolean).join(", ");
  return {
    prompt,
    negativePrompt,
    width,
    height,
    guidanceScale: Number(options.guidanceScale ?? 7),
    numInferenceSteps: Number(options.numInferenceSteps ?? 28),
    seed: typeof options.seed === "number" && Number.isFinite(options.seed) ? Math.trunc(options.seed) : null,
    printTarget,
    stylePreset: preset.id,
    safetyNotes: [
      ...base.warnings,
      ...(textRequested ? ["AI-generated text may be unreliable; owner spelling review is required."] : [])
    ],
    textRequested,
    basePackage: base
  };
}
