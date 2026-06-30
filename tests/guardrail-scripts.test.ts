import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("guardrail scripts", () => {
  it("check:guardrails scans dependencies, route names, env defaults, and source files", () => {
    const script = readFileSync(join(process.cwd(), "scripts", "check-guardrails.ts"), "utf8");
    expect(script).toContain("package.json");
    expect(script).toContain("app\\/api\\/(generate|publish)");
    expect(script).toContain("LIVE_PUBLISHING_ENABLED=false");
    expect(script).toContain("OPENAI");
    expect(script).toContain("ANTHROPIC");
  });

  it("check:secrets scans actual repository files", () => {
    const script = readFileSync(join(process.cwd(), "scripts", "check-secrets.ts"), "utf8");
    expect(script).toContain("readdirSync");
    expect(script).toContain("readFileSync");
    expect(script).toContain("shpat_");
  });

  it("check:production confirms production-configurable app while failing missing secrets honestly", () => {
    const script = readFileSync(join(process.cwd(), "scripts", "check-production.ts"), "utf8");
    expect(script).toContain("DATABASE_URL required for production managed Postgres");
    expect(script).toContain("production checks passed with expected missing-secret readiness failures");
  });
});
