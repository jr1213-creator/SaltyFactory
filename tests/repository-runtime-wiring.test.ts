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

  it("Studio proxy does not import DB-backed auth and DB pages/routes use Node runtime", () => {
    const proxy = readFileSync(join(process.cwd(), "apps", "studio", "proxy.ts"), "utf8");
    const layout = readFileSync(join(process.cwd(), "apps", "studio", "app", "studio", "layout.tsx"), "utf8");
    const healthRoute = readFileSync(join(process.cwd(), "apps", "studio", "app", "api", "studio", "db", "health", "route.ts"), "utf8");

    expect(proxy).not.toContain("@saltyfactory/auth");
    expect(proxy).not.toContain("requireStudioUser");
    expect(proxy).not.toContain("createRepositories");
    expect(layout).toContain('runtime = "nodejs"');
    expect(healthRoute).toContain('runtime = "nodejs"');
    expect(healthRoute).toContain("checkRuntimeDatabaseConnection");
    expect(healthRoute).toContain("sanitizeStudioDataError");
  });
});
