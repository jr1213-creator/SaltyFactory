import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { tables } from "@saltyfactory/db";

const nonWorkspaceTables = new Set(["users", "organizations", "organizationMembers", "workspaces", "plans", "subscriptions", "billingEvents", "featureLimits"]);

describe("db schema workspace ownership", () => {
  it("workspace-owned tables include workspace_id, created_at, and updated_at", () => {
    for (const [exportName, table] of Object.entries(tables)) {
      if (nonWorkspaceTables.has(exportName)) continue;
      const columns = Object.keys(getTableColumns(table));
      expect(columns, exportName).toContain("workspaceId");
      expect(columns, exportName).toContain("createdAt");
      expect(columns, exportName).toContain("updatedAt");
    }
  });

  it("all exported tables have an id primary key property", () => {
    for (const [exportName, table] of Object.entries(tables)) {
      expect(Object.keys(getTableColumns(table)), exportName).toContain("id");
    }
  });
});
