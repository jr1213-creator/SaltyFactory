import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (["node_modules", ".next", "dist"].includes(entry)) return [];
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe("static guardrails", () => {
  it("has no OpenAI or Anthropic dependency", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const deps = JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies }).toLowerCase();
    expect(deps).not.toContain("openai");
    expect(deps).not.toContain("anthropic");
  });

  it("has no public AI generation or publish endpoint", () => {
    const routes = walk(join(process.cwd(), "apps")).filter((file) => file.endsWith("route.ts")).map((file) => file.replace(/\\/g, "/"));
    expect(routes.filter((route) => /app\/api\/(generate|publish)/.test(route) && !/app\/api\/studio\//.test(route))).toEqual([]);
  });

  it("stores no raw tokens in DB schema", () => {
    const schema = readFileSync(join(process.cwd(), "packages", "db", "src", "schema.ts"), "utf8").toLowerCase();
    expect(schema).not.toMatch(/api_token|admin_token|printify_token|hf_token|password/);
    expect(schema).toContain("secretref");
  });

  it("live publishing is false by default", () => {
    expect(readFileSync(join(process.cwd(), ".env.example"), "utf8")).toContain("LIVE_PUBLISHING_ENABLED=false");
  });
});
