import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import StorefrontHome from "../apps/storefront/app/page";
import { proxy } from "../apps/studio/proxy";
import {
  setCodeExchangerForTests,
  setMagicLinkStarterForTests,
  setSupabaseUserVerifierForTests,
  setWorkspaceAuthorizerForTests,
  SUPABASE_ACCESS_COOKIE
} from "@saltyfactory/auth";
import { GET as loginGet, POST as loginPost } from "../apps/studio/app/api/studio/login/route";
import { GET as callbackGet } from "../apps/studio/app/auth/callback/route";
import { GET as authDebugGet } from "../apps/studio/app/api/studio/auth/debug/route";
import { POST as approveDraftPost } from "../apps/studio/app/api/studio/drafts/approve/route";
import { POST as shopifyPublishPost } from "../apps/studio/app/api/studio/publish/shopify/route";
import { POST as printifyPublishPost } from "../apps/studio/app/api/studio/publish/printify/route";
import { POST as generateSubmitPost } from "../apps/studio/app/api/studio/generate/submit/route";

const originalEnv = { ...process.env };
const email = "admin@saltycowhide.com";

function request(path: string, cookie = "") {
  return {
    headers: new Headers(cookie ? { cookie } : {}),
    nextUrl: new URL(`http://localhost:3001${path}`),
    url: `http://localhost:3001${path}`
  } as any;
}

function formRequest(email: string) {
  const form = new FormData();
  form.set("email", email);
  return new Request("http://localhost:3001/api/studio/login", { method: "POST", body: form });
}

function apiRequest(path: string, token = "valid") {
  return new Request(`http://localhost:3001${path}`, {
    method: "POST",
    headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=${token}` }
  });
}

function authorizeAs(role: "owner" | "admin" | "reviewer" | "member" | "operator" | "viewer", workspace = "wks_default") {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: "auth_user_01", email, emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, workspaceId) => workspaceId === workspace ? {
    id: user.id,
    email: user.email,
    role,
    workspaceId,
    supabaseUserId: user.id
  } : null);
}

function listSourceFiles(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", "dist"].includes(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) listSourceFiles(path, out);
    else if (/\.(ts|tsx|js|json|env|example)$/.test(entry)) out.push(path);
  }
  return out;
}

afterEach(() => {
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
  setMagicLinkStarterForTests(null);
  setCodeExchangerForTests(null);
});

describe("production UI guardrails", () => {
  it("No private trend data appears in storefront HTML", async () => {
    const html = renderToStaticMarkup(await StorefrontHome());
    expect(html).not.toMatch(/trend_signal|generation_prompt|audit_events|provider secret/i);
  });

  it("No generation prompts appear in storefront HTML", async () => {
    const html = renderToStaticMarkup(await StorefrontHome());
    expect(html).not.toMatch(/negative prompt|prompt_ref|generation prompt/i);
  });

  it("No API secrets appear in rendered output", async () => {
    const html = renderToStaticMarkup(await StorefrontHome());
    expect(html).not.toMatch(/SHOPIFY_ADMIN_TOKEN|PRINTIFY_API_TOKEN|HF_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY/i);
  });

  it("Login page does not use a plain API form action", () => {
    const page = readFileSync(join(process.cwd(), "apps/studio/app/login/page.tsx"), "utf8");
    const form = readFileSync(join(process.cwd(), "apps/studio/app/login/LoginForm.tsx"), "utf8");
    expect(`${page}\n${form}`).not.toContain('action="/api/studio/login"');
    expect(form).toContain('fetch("/api/studio/login"');
  });

  it("Login POST starts Supabase magic-link flow and does not create a local session", async () => {
    const calls: string[] = [];
    setMagicLinkStarterForTests(async (submittedEmail) => { calls.push(submittedEmail); });
    const response = await loginPost(formRequest(email));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, status: "email_sent" });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(calls).toEqual([email]);
  });

  it("Login POST uses /auth/callback and preserves Supabase PKCE cookies", async () => {
    const redirects: string[] = [];
    setMagicLinkStarterForTests(async (_submittedEmail, redirectTo, cookies) => {
      redirects.push(redirectTo);
      cookies?.setAll?.([
        { name: "sb-test-auth-token-code-verifier", value: "verifier", options: { path: "/", httpOnly: true, sameSite: "lax" } }
      ], { "Cache-Control": "private, no-store" });
    });
    const response = await loginPost(formRequest(email));
    expect(response.status).toBe(200);
    expect(redirects).toEqual(["http://localhost:3001/auth/callback"]);
    expect(response.headers.get("set-cookie")).toContain("sb-test-auth-token-code-verifier");
    expect(await response.json()).toEqual({ ok: true, status: "email_sent" });
  });

  it("Email-only POST cannot create a custom Studio session", async () => {
    setMagicLinkStarterForTests(async () => undefined);
    const response = await loginPost(formRequest("other@example.com"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, status: "email_sent" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("Missing Supabase Auth config returns safe 503 without cookie", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    const response = await loginPost(formRequest(email));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false, status: "not_configured" });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("GET /api/studio/login does not create a session", async () => {
    const response = await loginGet();
    expect(response.status).toBe(405);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("Unauthenticated Studio redirects to login even when admin env is configured", async () => {
    process.env.STUDIO_ADMIN_EMAIL = email;
    const response = await proxy(request("/studio"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("Studio API unauthenticated returns 401 JSON", async () => {
    process.env.STUDIO_ADMIN_EMAIL = email;
    const response = await proxy(request("/api/studio/trends/ingest"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false, status: "unauthorized" });
  });

  it("Studio auth debug is available only outside production and never returns cookies", async () => {
    const response = await authDebugGet(new Request("http://localhost:3001/api/studio/auth/debug"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ ok: true, hasSession: false });
    expect(JSON.stringify(payload)).not.toMatch(/cookie|token|service/i);

    process.env.APP_ENV = "production";
    const productionResponse = await authDebugGet(new Request("http://localhost:3001/api/studio/auth/debug"));
    expect(productionResponse.status).toBe(404);
  });

  it("Studio login API is public enough to create a session", async () => {
    const response = await proxy(request("/api/studio/login"));
    expect(response.status).toBe(200);
  });

  it("Valid Supabase session and workspace membership passes proxy protection", async () => {
    setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: "auth_user_01", email, emailVerified: true } : null);
    setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({ id: user.id, email: user.email, role: "owner", workspaceId, supabaseUserId: user.id }));
    const response = await proxy(request("/studio", `${SUPABASE_ACCESS_COOKIE}=valid`));
    expect(response.status).toBe(200);
  });

  it("Supabase callback success establishes Supabase cookies", async () => {
    setCodeExchangerForTests(async (_code, cookies) => {
      cookies?.setAll?.([
        { name: "sb-test-auth-token", value: "session", options: { path: "/", httpOnly: true, sameSite: "lax" } }
      ], { "Cache-Control": "private, no-store" });
      return { access_token: "access", refresh_token: "refresh", expires_in: 3600 };
    });
    const response = await callbackGet(new Request("http://localhost:3001/auth/callback?code=abc"));
    expect(response.status).toBe(307);
    expect(response.headers.get("set-cookie")).toContain("sb-test-auth-token");
    expect(response.headers.get("location")).toContain("/studio");
  });

  it("Supabase callback without code redirects safely", async () => {
    const response = await callbackGet(new Request("http://localhost:3001/auth/callback"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?error=missing_code");
  });

  it("Supabase callback exchange failure redirects safely", async () => {
    setCodeExchangerForTests(async () => {
      throw new Error("sensitive provider failure");
    });
    const response = await callbackGet(new Request("http://localhost:3001/auth/callback?code=abc"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?error=callback_failed");
  });

  it("No code contains misspelled Studio login route", () => {
    const contents = listSourceFiles(process.cwd()).map((file) => readFileSync(file, "utf8")).join("\n");
    const misspelledSegment = "studio" + "n";
    expect(contents).not.toContain(`/api/${misspelledSegment}/login`);
    expect(contents).not.toContain(misspelledSegment);
  });

  it("Reviewer cannot approve drafts", async () => {
    authorizeAs("reviewer");
    const response = await approveDraftPost(apiRequest("/api/studio/drafts/approve"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false, status: "forbidden" });
  });

  it("Reviewer cannot publish to Shopify or sync to Printify", async () => {
    authorizeAs("reviewer");
    const shopify = await shopifyPublishPost(apiRequest("/api/studio/publish/shopify"));
    const printify = await printifyPublishPost(apiRequest("/api/studio/publish/printify"));
    expect(shopify.status).toBe(403);
    expect(printify.status).toBe(403);
  });

  it("Reviewer cannot perform provider-impacting generation mutations", async () => {
    authorizeAs("reviewer");
    const response = await generateSubmitPost(apiRequest("/api/studio/generate/submit"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false, status: "forbidden" });
  });

  it("Owner and admin can reach privileged routes but publish gates and provider-disabled states still block live actions", async () => {
    for (const role of ["owner", "admin"] as const) {
      authorizeAs(role);
      const approve = await approveDraftPost(apiRequest("/api/studio/drafts/approve"));
      expect(approve.status).toBe(501);
      await expect(approve.json()).resolves.toMatchObject({ ok: false, status: "not_implemented" });

      const shopify = await shopifyPublishPost(apiRequest("/api/studio/publish/shopify"));
      const printify = await printifyPublishPost(apiRequest("/api/studio/publish/printify"));
      const generate = await generateSubmitPost(apiRequest("/api/studio/generate/submit"));
      expect(shopify.status).toBe(501);
      expect(printify.status).toBe(501);
      expect(generate.status).toBe(503);
      await expect(shopify.json()).resolves.toMatchObject({
        ok: false,
        status: "not_implemented",
        blockingReasons: expect.arrayContaining([
          "Persisted publish review lookup is not implemented for this route.",
          "Provider sync is disabled until Shopify connection is configured.",
          "Live publishing remains disabled by default."
        ])
      });
      await expect(printify.json()).resolves.toMatchObject({
        ok: false,
        status: "not_implemented",
        blockingReasons: expect.arrayContaining([
          "Persisted publish review lookup is not implemented for this route.",
          "Provider sync is disabled until Printify connection is configured.",
          "Live publishing remains disabled by default."
        ])
      });
      await expect(generate.json()).resolves.toMatchObject({ ok: false, status: "provider_disabled" });
    }
  });

  it("Publish routes do not contain fixture-only fake success branches", () => {
    const publishShopify = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/publish/shopify/route.ts"), "utf8");
    const publishPrintify = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/publish/printify/route.ts"), "utf8");
    const shopifyPost = publishShopify.split("export async function POST")[1];
    const printifyPost = publishPrintify.split("export async function POST")[1];
    expect(shopifyPost).not.toMatch(/ok:\s*true/);
    expect(printifyPost).not.toMatch(/ok:\s*true/);
    expect(shopifyPost).toContain("evaluatePublishReviewGates");
    expect(printifyPost).toContain("evaluatePublishReviewGates");
    expect(shopifyPost).not.toMatch(/SHOPIFY_ADMIN_TOKEN|PRINTIFY_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
    expect(printifyPost).not.toMatch(/SHOPIFY_ADMIN_TOKEN|PRINTIFY_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("Authenticated user without workspace membership is forbidden", async () => {
    setSupabaseUserVerifierForTests(async () => ({ id: "auth_user_01", email, emailVerified: true }));
    setWorkspaceAuthorizerForTests(async () => null);
    const response = await approveDraftPost(apiRequest("/api/studio/drafts/approve"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ ok: false, status: "forbidden" });
  });

  it("Wrong workspace authorization is blocked without using client-provided workspace fields", async () => {
    setSupabaseUserVerifierForTests(async () => ({ id: "auth_user_01", email, emailVerified: true }));
    setWorkspaceAuthorizerForTests(async (_user, workspaceId) => workspaceId === "wks_other" ? {
      id: "auth_user_01",
      email,
      role: "owner",
      workspaceId,
      supabaseUserId: "auth_user_01"
    } : null);
    const response = await shopifyPublishPost(apiRequest("/api/studio/publish/shopify"));
    expect(response.status).toBe(403);
  });

  it("Guardrails require route-level permissions on privileged Studio APIs", () => {
    const publishShopify = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/publish/shopify/route.ts"), "utf8");
    const publishPrintify = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/publish/printify/route.ts"), "utf8");
    const approveDraft = readFileSync(join(process.cwd(), "apps/studio/app/api/studio/drafts/approve/route.ts"), "utf8");
    expect(publishShopify).toContain("requirePublishPermission");
    expect(publishPrintify).toContain("requirePublishPermission");
    expect(approveDraft).toContain("requireApprovalPermission");
    expect(`${publishShopify}\n${publishPrintify}\n${approveDraft}`).not.toMatch(/requireAuditActor\s*\(/);
  });
});
