import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadRootEnvLocal, validateStudioOwnerSeedEnv } from "../scripts/seed-studio-owner";

describe("Studio owner seed script", () => {
  it("rejects missing required configuration", () => {
    expect(() => validateStudioOwnerSeedEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateStudioOwnerSeedEnv({ DATABASE_URL: "postgres://db" })).toThrow(/STUDIO_ADMIN_EMAIL/);
    expect(() => validateStudioOwnerSeedEnv({
      DATABASE_URL: "postgres://db",
      STUDIO_ADMIN_EMAIL: "admin@example.com",
      SUPABASE_URL: "https://example.supabase.co"
    })).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("loads root .env.local without overriding process env", () => {
    const dir = mkdtempSync(join(tmpdir(), "sf-seed-env-"));
    try {
      writeFileSync(join(dir, ".env.local"), [
        "DATABASE_URL=postgres://from-file",
        "STUDIO_ADMIN_EMAIL=admin@example.com",
        "SUPABASE_SERVICE_ROLE_KEY='service-value'"
      ].join("\n"));
      const target: Record<string, string | undefined> = { DATABASE_URL: "postgres://from-env" };
      expect(loadRootEnvLocal(dir, target)).toBe(true);
      expect(target.DATABASE_URL).toBe("postgres://from-env");
      expect(target.STUDIO_ADMIN_EMAIL).toBe("admin@example.com");
      expect(target.SUPABASE_SERVICE_ROLE_KEY).toBe("service-value");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not use top-level await or workspace package imports", () => {
    const source = readFileSync(join(process.cwd(), "scripts/seed-studio-owner.ts"), "utf8");
    expect(source).toContain("async function main()");
    expect(source).toContain("main().catch");
    expect(source).not.toMatch(/^const\s+.*=\s+await\s/m);
    expect(source).not.toContain("from \"@saltyfactory/db\"");
  });

  it("uses idempotent upserts for users, organizations, workspaces, and membership", () => {
    const source = readFileSync(join(process.cwd(), "scripts/seed-studio-owner.ts"), "utf8");
    expect(source.match(/on conflict/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain("on conflict (organization_id, user_id) do update");
    expect(source).toContain("role = 'owner'");
    expect(source).toContain("STUDIO_WORKSPACE_ID || \"wks_default\"");
  });

  it("prints only a safe summary shape", () => {
    const source = readFileSync(join(process.cwd(), "scripts/seed-studio-owner.ts"), "utf8");
    expect(source).toContain("foundAuthUser");
    expect(source).toContain("membershipAlreadyExists");
    expect(source).not.toContain("console.log(databaseUrl");
    expect(source).not.toContain("console.log(serviceRoleKey");
    expect(source).not.toContain("console.log(env.");
  });
});
