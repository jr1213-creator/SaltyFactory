import { afterEach, describe, expect, it, vi } from "vitest";
import { requireAuditActor, requireStudioUser } from "@saltyfactory/auth";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("studio auth", () => {
  it("/studio requires auth", async () => {
    delete process.env.STUDIO_ADMIN_EMAIL;
    await expect(requireStudioUser()).rejects.toMatchObject({ message: "unauthenticated" });
  });

  it("/api/studio/* requires auth through the same helper", async () => {
    delete process.env.STUDIO_ADMIN_EMAIL;
    await expect(requireStudioUser()).rejects.toMatchObject({ status: 401 });
  });

  it("has no production auth bypass", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.STUDIO_AUTH_ENABLED = "false";
    await expect(requireStudioUser()).rejects.toThrow("Production auth bypass forbidden");
  });

  it("audit actor is required for approval and publish actions", async () => {
    delete process.env.STUDIO_ADMIN_EMAIL;
    await expect(requireAuditActor()).rejects.toThrow("audit_actor_required");
  });
});
