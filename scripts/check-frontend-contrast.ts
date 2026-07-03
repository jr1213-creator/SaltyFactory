import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Rgb = { r: number; g: number; b: number };
type ContrastCheck = {
  app: "studio" | "storefront";
  foreground: string;
  background: string;
  required: number;
  context: string;
};

const cssFiles = {
  studio: "apps/studio/app/globals.css",
  storefront: "apps/storefront/app/globals.css"
} as const;

const checks: ContrastCheck[] = [
  { app: "studio", foreground: "foreground", background: "background", required: 4.5, context: "Primary page text" },
  { app: "studio", foreground: "foreground", background: "card", required: 4.5, context: "Card text" },
  { app: "studio", foreground: "muted-foreground", background: "card", required: 4.5, context: "Muted card text" },
  { app: "studio", foreground: "primary-dark", background: "primary-soft", required: 4.5, context: "Primary soft badges and setup states" },
  { app: "studio", foreground: "primary-foreground", background: "primary", required: 4.5, context: "Primary buttons" },
  { app: "studio", foreground: "navy", background: "sand", required: 4.5, context: "Sand source labels and avatar chips" },
  { app: "studio", foreground: "destructive", background: "destructive-soft", required: 4.5, context: "Blocked/destructive messaging" },
  { app: "studio", foreground: "success", background: "success-soft", required: 4.5, context: "Success badges and passed gates" },
  { app: "studio", foreground: "warning", background: "warning-soft", required: 4.5, context: "Warning badges and owner-gated states" },
  { app: "studio", foreground: "info", background: "info-soft", required: 4.5, context: "Informational badges" },
  { app: "storefront", foreground: "foreground", background: "background", required: 4.5, context: "Primary storefront text" },
  { app: "storefront", foreground: "foreground", background: "card", required: 4.5, context: "Storefront card text" },
  { app: "storefront", foreground: "muted-foreground", background: "card", required: 4.5, context: "Storefront muted text" },
  { app: "storefront", foreground: "primary-dark", background: "primary-soft", required: 4.5, context: "Storefront setup announcement" },
  { app: "storefront", foreground: "primary-foreground", background: "primary", required: 4.5, context: "Storefront primary buttons" },
  { app: "storefront", foreground: "navy", background: "sand", required: 4.5, context: "Storefront warm accent labels" },
  { app: "storefront", foreground: "destructive", background: "destructive-soft", required: 4.5, context: "Storefront blocked states" },
  { app: "storefront", foreground: "success", background: "success-soft", required: 4.5, context: "Storefront success states" },
  { app: "storefront", foreground: "warning", background: "warning-soft", required: 4.5, context: "Storefront warning states" },
  { app: "storefront", foreground: "info", background: "info-soft", required: 4.5, context: "Storefront informational states" }
];

function parseThemeTokens(css: string): Record<string, string> {
  return Object.fromEntries(
    [...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((match) => [match[1]!, match[2]!.toLowerCase()])
  );
}

function hexToRgb(hex: string): Rgb {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16)
  };
}

function srgbToLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb: Rgb) {
  return 0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);
}

export function contrastRatio(foreground: string, background: string) {
  const first = luminance(hexToRgb(foreground));
  const second = luminance(hexToRgb(background));
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

export function runFrontendContrastAudit() {
  const tokensByApp = Object.fromEntries(
    Object.entries(cssFiles).map(([app, file]) => [app, parseThemeTokens(readFileSync(file, "utf8"))])
  ) as Record<keyof typeof cssFiles, Record<string, string>>;

  const results = checks.map((check) => {
    const tokens = tokensByApp[check.app];
    const foreground = tokens[check.foreground];
    const background = tokens[check.background];
    if (!foreground || !background) {
      throw new Error(`Missing color token for ${check.app}: ${check.foreground} on ${check.background}`);
    }
    const ratio = contrastRatio(foreground, background);
    return {
      ...check,
      foregroundValue: foreground,
      backgroundValue: background,
      ratio,
      passed: ratio >= check.required
    };
  });

  return { results, passed: results.every((result) => result.passed) };
}

function renderReport() {
  const { results, passed } = runFrontendContrastAudit();
  const generatedAt = new Date().toISOString();
  const rows = results.map((result) => [
    result.app,
    result.context,
    `\`${result.foreground}\` ${result.foregroundValue}`,
    `\`${result.background}\` ${result.backgroundValue}`,
    result.ratio.toFixed(2),
    result.required.toFixed(1),
    result.passed ? "Pass" : "Fail"
  ]);

  return [
    "# Frontend Contrast Report v1",
    "",
    `Generated by \`corepack pnpm check:frontend-contrast\` at ${generatedAt}.`,
    "",
    "Scope: Tailwind v4 color tokens used by Studio, storefront, and shared UI components. This report checks critical text/background pairs for WCAG AA normal-text contrast.",
    "",
    `Overall status: ${passed ? "Pass" : "Fail"}`,
    "",
    "| App | Context | Foreground | Background | Ratio | Required | Status |",
    "| --- | --- | --- | --- | ---: | ---: | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "Notes:",
    "- This is a token-pair audit, not a substitute for authenticated browser visual QA.",
    "- Hover, focus, chart, and image-overlay states should still be checked in browser QA.",
    "- Authenticated Studio screenshots remain gated on a browser-safe Supabase Auth fixture.",
    ""
  ].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = renderReport();
  writeFileSync("docs/frontend-contrast-report-v1.md", report);
  const { passed, results } = runFrontendContrastAudit();
  const failed = results.filter((result) => !result.passed);
  console.log(report);
  if (!passed) {
    throw new Error(`Frontend contrast audit failed: ${failed.map((result) => `${result.app} ${result.context}`).join(", ")}`);
  }
}
