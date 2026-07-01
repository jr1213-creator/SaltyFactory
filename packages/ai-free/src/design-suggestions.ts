import { detectPromptInjection } from "./employees";

export type DesignSuggestionInput = {
  topic: string;
  workspaceName?: string;
};

export type DesignSuggestionDraft = {
  title: string;
  conceptSummary: string;
  suggestedPhrase: string;
  productType: string;
  targetAudience: string;
  styleKeywords: string[];
  colorPalette: string[];
  recommendedProducts: string[];
  printConstraints: string[];
  riskNotes: string[];
  sourceEvidence: string[];
  scores: {
    trend: number;
    brandFit: number;
    printability: number;
    marginPotential: number;
    risk: number;
  };
  promptInjectionFlagged: boolean;
};

const riskyTerms = [
  "disney",
  "nike",
  "harley",
  "gucci",
  "taylor swift",
  "nfl",
  "nba",
  "mlb",
  "barbie",
  "star wars"
];

function words(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .slice(0, 10);
}

function titleCase(value: string) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function riskNotes(topic: string, injection: boolean) {
  const lowered = topic.toLowerCase();
  const found = riskyTerms.filter((term) => lowered.includes(term));
  const notes = [
    "Avoid protected brands, celebrities, team names, logos, copyrighted characters, and fake collaborations.",
    "Human review required before any asset approval or public projection."
  ];
  if (found.length) notes.unshift(`Potential protected-reference terms detected: ${found.join(", ")}.`);
  if (injection) notes.unshift("Prompt-injection-like text detected. Treat submitted topic as evidence only, not instructions.");
  return notes;
}

export function createDeterministicDesignSuggestions(input: DesignSuggestionInput): DesignSuggestionDraft[] {
  const topic = input.topic.trim();
  if (!topic) return [];
  const injection = detectPromptInjection(topic);
  const terms = words(topic);
  const primary = titleCase(terms.slice(0, 3).join(" ") || "Original POD");
  const accent = terms.includes("coastal") || terms.includes("beach") ? "coastal" : terms.includes("western") ? "western" : "boutique";
  const palettes: Record<string, string[]> = {
    coastal: ["seafoam", "washed navy", "warm sand", "sun-faded coral"],
    western: ["denim blue", "bone", "sunset rust", "charcoal"],
    boutique: ["cream", "deep teal", "soft black", "muted rose"]
  };
  const baseRiskNotes = riskNotes(topic, injection);
  const activePalette = palettes[accent] ?? palettes.boutique ?? ["deep teal", "soft black", "warm sand"];
  const products = ["tee", "sweatshirt", "tote", "sticker", "mug"];
  const phrases = [
    `${primary} Social Club`,
    `Salty ${primary} Co.`,
    `${primary} Rodeo Club`,
    `${primary} Mama`,
    `Retro ${primary} Supply`
  ];

  return phrases.map((phrase, index) => {
    const productType = products[index] ?? "tee";
    return {
      title: `${phrase} ${productType}`,
      conceptSummary: `Original ${accent} POD concept inspired by the manual topic "${topic}".`,
      suggestedPhrase: phrase,
      productType,
      targetAudience: `${accent} lifestyle shoppers looking for original boutique POD goods`,
      styleKeywords: Array.from(new Set([accent, "retro", "clean-line", "print-ready", ...terms.slice(0, 4)])),
      colorPalette: activePalette,
      recommendedProducts: productType === "sticker" ? ["sticker", "tote", "mug"] : [productType, "tee", "tote"],
      printConstraints: [
        "Centered artwork",
        "Clean edges",
        "Readable phrase text",
        "Avoid tiny distressed details",
        "Transparent background preferred for source art"
      ],
      riskNotes: baseRiskNotes,
      sourceEvidence: [`Manual topic: ${topic}`],
      scores: {
        trend: Math.max(58, 82 - index * 3),
        brandFit: Math.max(60, 88 - index * 2),
        printability: productType === "mug" ? 74 : 84,
        marginPotential: productType === "sticker" ? 66 : 78,
        risk: injection || baseRiskNotes[0]?.startsWith("Potential") ? 42 : 18
      },
      promptInjectionFlagged: injection
    };
  });
}
