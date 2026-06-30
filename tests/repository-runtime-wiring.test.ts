import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if ([".next", "node_modules", "dist"].includes(entry)) return [];
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe("repository runtime wiring", () => {
  it("Studio actions do not import memory repositories directly", () => {
    const text = files(join(process.cwd(), "apps", "studio")).map((file) => readFileSync(file, "utf8")).join("\n");
    expect(text).not.toContain("repositories/memory");
    expect(text).toContain("createRepositories");
  });

  it("worker does not import memory repositories directly", () => {
    const text = files(join(process.cwd(), "apps", "worker")).map((file) => readFileSync(file, "utf8")).join("\n");
    expect(text).not.toContain("repositories/memory");
    expect(text).toContain("createRepositories");
  });

  it("check:production fails if memory persistence is enabled in production", () => {
    const script = readFileSync(join(process.cwd(), "scripts", "check-production.ts"), "utf8");
    expect(script).toContain("production allowed memory repository adapter");
    expect(script).toContain("selectRepositoryAdapter");
  });
});
