import { afterEach, describe, expect, it, vi } from "vitest";
import {
  requireAuditActor,
  requireApprovalPermission,
  requireDraftMutationPermission,
  requireProviderMutationPermission,
  requirePublishPermission,
  requireReviewerOrAbove,
  requireStudioUser,
  setCodeExchangerForTests,
  setMagicLinkStarterForTests,
  setSupabaseUserVerifierForTests,
  setWorkspaceAuthorizerForTests,
  startStudioMagicLink,
  SUPABASE_ACCESS_COOKIE,
  supabaseSessionCookies
} from "@saltyfactory/auth";

const originalEnv = { ...process.env };
const identity = { id: "auth_user_01", email: "admin@saltycowhide.com", emailVerified: true };

function requestWithAccessToken(value: string) {
  return new Request("http://localhost:3001/studio", {
    headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=${value}` }
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
  setMagicLinkStarterForTests(null);
  setCodeExchangerForTests(null);
});

describe("studio auth", () => {
  it("/studio requires a verified Supabase session, not only STUDIO_ADMIN_EMAIL", async () => {
    process.env.STUDIO_ADMIN_EMAIL = identity.email;
    await expect(requireStudioUser()).rejects.toMatchObject({ message: "unauthenticated", status: 401 });
  });

  it("starts Supabase magic-link flow without creating a local session", async () => {
    const calls: Array<{ email: string; redirectTo: string }> = [];
    setMagicLinkStarterForTests(async (email, redirectTo) => { calls.push({ email, redirectTo }); });
    await expect(startStudioMagicLink(identity.email, "http://localhost:3001/auth/callback")).resolves.toMatchObject({ ok: true });
    expect(calls).toEqual([{ email: identity.email, redirectTo: "http://localhost:3001/auth/callback" }]);
  });

  it("accepts a verified Supabase user with workspace membership", async () => {
    setSupabaseUserVerifierForTests(async (token) => token === "valid" ? identity : null);
    setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({ id: user.id, email: user.email, role: "owner", workspaceId, supabaseUserId: user.id }));
    await expect(requireStudioUser(requestWithAccessToken("valid"))).resolves.toMatchObject({ email: identity.email, role: "owner" });
  });

  it("rejects authenticated Supabase user without verified email", async () => {
    setSupabaseUserVerifierForTests(async () => ({ ...identity, emailVerified: false }));
    setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({ id: user.id, email: user.email, role: "owner", workspaceId, supabaseUserId: user.id }));
    await expect(requireStudioUser(requestWithAccessToken("unverified"))).rejects.toMatchObject({ status: 401 });
  });

  it("rejects authenticated Supabase user without workspace membership", async () => {
    setSupabaseUserVerifierForTests(async () => identity);
    setWorkspaceAuthorizerForTests(async () => null);
    await expect(requireStudioUser(requestWithAccessToken("valid"))).rejects.toMatchObject({ status: 403 });
  });

  it("rejects wrong workspace authorization", async () => {
    setSupabaseUserVerifierForTests(async () => identity);
    setWorkspaceAuthorizerForTests(async (_user, workspaceId) => workspaceId === "wks_allowed" ? { id: identity.id, email: identity.email, role: "admin", workspaceId, supabaseUserId: identity.id } : null);
    await expect(requireStudioUser(requestWithAccessToken("valid"), "wks_other")).rejects.toMatchObject({ status: 403 });
    await expect(requireStudioUser(requestWithAccessToken("valid"), "wks_allowed")).resolves.toMatchObject({ workspaceId: "wks_allowed" });
  });

  it("rejects invalid or expired Supabase sessions", async () => {
    setSupabaseUserVerifierForTests(async () => null);
    await expect(requireStudioUser(requestWithAccessToken("expired"))).rejects.toMatchObject({ status: 401 });
  });

  it("has no production auth bypass", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.STUDIO_AUTH_ENABLED = "false";
    await expect(requireStudioUser()).rejects.toThrow("Production auth bypass forbidden");
  });

  it("audit actor is required for approval and publish actions", async () => {
    await expect(requireAuditActor()).rejects.toThrow("audit_actor_required");
  });

  it("reviewer can review but cannot approve, publish, or run provider mutations", async () => {
    setSupabaseUserVerifierForTests(async () => identity);
    setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
      id: user.id,
      email: user.email,
      role: "reviewer",
      workspaceId,
      supabaseUserId: user.id
    }));
    const req = requestWithAccessToken("valid");
    await expect(requireReviewerOrAbove(req)).resolves.toMatchObject({ role: "reviewer" });
    await expect(requireApprovalPermission(req)).rejects.toMatchObject({ status: 403 });
    await expect(requirePublishPermission(req)).rejects.toMatchObject({ status: 403 });
    await expect(requireProviderMutationPermission(req)).rejects.toMatchObject({ status: 403 });
  });

  it("owner and admin can perform privileged workspace actions", async () => {
    setSupabaseUserVerifierForTests(async () => identity);
    for (const role of ["owner", "admin"] as const) {
      setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
        id: user.id,
        email: user.email,
        role,
        workspaceId,
        supabaseUserId: user.id
      }));
      const req = requestWithAccessToken("valid");
      await expect(requireApprovalPermission(req)).resolves.toMatchObject({ role });
      await expect(requirePublishPermission(req)).resolves.toMatchObject({ role });
      await expect(requireProviderMutationPermission(req)).resolves.toMatchObject({ role });
    }
  });

  it("member and operator can draft but cannot approve or publish", async () => {
    setSupabaseUserVerifierForTests(async () => identity);
    for (const role of ["member", "operator"] as const) {
      setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
        id: user.id,
        email: user.email,
        role,
        workspaceId,
        supabaseUserId: user.id
      }));
      const req = requestWithAccessToken("valid");
      await expect(requireDraftMutationPermission(req)).resolves.toMatchObject({ role });
      await expect(requireApprovalPermission(req)).rejects.toMatchObject({ status: 403 });
      await expect(requirePublishPermission(req)).rejects.toMatchObject({ status: 403 });
    }
  });

  it("creates Supabase session cookies only from Supabase callback session data", () => {
    const cookies = supabaseSessionCookies({ access_token: "access", refresh_token: "refresh", expires_in: 3600 });
    expect(cookies.join("\n")).toContain(SUPABASE_ACCESS_COOKIE);
    expect(cookies.join("\n")).toContain("HttpOnly");
  });
});
