import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const sourceRoots = ["apps/studio", "apps/storefront", "packages/ui/src"];
const ignoredDirectories = new Set([".next", "node_modules"]);

function sourceFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const stat = statSync(root);
  if (stat.isFile()) return /\.(css|ts|tsx|json|mjs)$/.test(root) ? [root] : [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    return sourceFiles(join(root, entry.name));
  });
}

describe("Tailwind migration", () => {
  it("does not leave legacy class prefixes in app/UI source", () => {
    const legacyPrefix = "sf" + "-";
    const offenders = sourceRoots
      .flatMap(sourceFiles)
      .filter((file) => readFileSync(file, "utf8").includes(legacyPrefix));

    expect(offenders).toEqual([]);
  });

  it("uses Tailwind v4 and shadcn-style primitives for the shared design system", () => {
    expect(readFileSync("apps/studio/app/globals.css", "utf8")).toContain('@import "tailwindcss"');
    expect(readFileSync("apps/storefront/app/globals.css", "utf8")).toContain('@import "tailwindcss"');
    expect(readFileSync("apps/studio/postcss.config.mjs", "utf8")).toContain("@tailwindcss/postcss");
    expect(readFileSync("apps/storefront/postcss.config.mjs", "utf8")).toContain("@tailwindcss/postcss");
    const uiSource = readFileSync("packages/ui/src/index.tsx", "utf8");
    expect(uiSource).toContain("class-variance-authority");
    expect(uiSource).toContain("@radix-ui/react-slot");
    expect(uiSource).toContain("tailwind-merge");
  });
});
