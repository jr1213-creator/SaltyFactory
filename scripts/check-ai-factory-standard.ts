import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "docs/standards/ai-software-factory-prompt-standard-v1.md",
  "docs/templates/codex-build-prompt-template.md",
  "docs/templates/claude-review-prompt-template.md",
  "docs/templates/gemini-review-prompt-template.md",
  "docs/templates/frontend-qa-prompt-template.md",
  "docs/templates/provider-integration-prompt-template.md",
  "docs/templates/security-review-prompt-template.md",
  "docs/templates/ai-code-review-checklist.md"
];

const requiredStandardText = [
  "Core Rule",
  "Prompt Template",
  "Required Phrasing",
  "Forbidden Completion Claims",
  "Feature Labels",
  "AI-Agent Authority",
  "Provider Integrity",
  "Frontend Quality",
  "Final Report Format"
];

const failures: string[] = [];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) failures.push(`missing required file: ${file}`);
}

const agentsPath = join(root, "AGENTS.md");
const standardPath = join(root, "docs/standards/ai-software-factory-prompt-standard-v1.md");

if (existsSync(agentsPath)) {
  const agents = readFileSync(agentsPath, "utf8");
  if (!agents.includes("docs/standards/ai-software-factory-prompt-standard-v1.md")) {
    failures.push("AGENTS.md must reference docs/standards/ai-software-factory-prompt-standard-v1.md");
  }
  for (const phrase of ["no fake completion", "no orphaned routes", "no fake provider success", "no secret leakage", "no AI self-authority", "tests required", "docs must match reality"]) {
    if (!agents.includes(phrase)) failures.push(`AGENTS.md missing non-negotiable: ${phrase}`);
  }
} else {
  failures.push("missing AGENTS.md");
}

if (existsSync(standardPath)) {
  const standard = readFileSync(standardPath, "utf8");
  for (const text of requiredStandardText) {
    if (!standard.includes(text)) failures.push(`prompt standard missing section: ${text}`);
  }
}

if (failures.length) {
  console.error("AI Software Factory Prompt Standard check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AI Software Factory Prompt Standard check passed");
