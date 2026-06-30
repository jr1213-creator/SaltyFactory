import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { parseEnv } from "@saltyfactory/config";
import { createIntegrationProviders } from "@saltyfactory/integrations";
import { assertPublicAuditUrl, runSiteAudit } from "@saltyfactory/site-audit";
import { safeFetchText, type SafeResolver, SafeFetchError } from "../packages/site-audit/src/safe-fetch";
import ProductPage from "../apps/storefront/app/products/[handle]/page";
import StorefrontHome from "../apps/storefront/app/page";
import { POST as runAuditPost } from "../apps/studio/app/api/studio/site-audit/run/route";
import {
  setSupabaseUserVerifierForTests,
  setWorkspaceAuthorizerForTests,
  SUPABASE_ACCESS_COOKIE
} from "@saltyfactory/auth";

const originalEnv = { ...process.env };
const publicUrl = "http://93.184.216.34/";

function auditFetch(url: string | URL) {
  const { pathname } = new URL(url);
  if (pathname === "/robots.txt") return Promise.resolve({ ok: true, status: 200, url: String(url), text: "User-agent: *\nAllow: /" });
  if (pathname === "/sitemap.xml") return Promise.resolve({ ok: true, status: 200, url: String(url), text: "<urlset><url><loc>http://93.184.216.34/products/tee</loc></url></urlset>" });
  if (pathname === "/llms.txt") return Promise.resolve({ ok: true, status: 200, url: String(url), text: "# Example\nAI-readable public summary." });
  if (pathname === "/llms-full.txt") return Promise.resolve({ ok: true, status: 200, url: String(url), text: "# Full Example\n" });
  return Promise.resolve({ ok: true, status: 200, url: String(url), text: `<!doctype html><html><head>
    <title>Example Store</title>
    <meta name="description" content="Premium coastal western store">
    <link rel="canonical" href="${publicUrl}">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Tee"}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Example"}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Example"}</script>
  </head><body><h1>Example Store</h1><h2>Featured</h2><a href="/products/tee">Product</a><img src="/tee.jpg" alt="Tee"></body></html>` });
}

function authRequest(body: unknown) {
  return new Request("http://localhost:3001/api/studio/site-audit/run", {
    method: "POST",
    headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=valid`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

afterEach(() => {
  process.env = { ...originalEnv };
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("site audit functional layer", () => {
  it("audits a valid public URL and detects robots, sitemap, llms, and JSON-LD schema", async () => {
    const result = await runSiteAudit({ websiteUrl: publicUrl, brandName: "Example" }, { fetcher: auditFetch, timeoutMs: 1000 });
    expect(result.indicators.robotsTxt).toBe(true);
    expect(result.indicators.sitemapXml).toBe(true);
    expect(result.indicators.llmsTxt).toBe(true);
    expect(result.indicators.jsonLd).toBe(true);
    expect(result.indicators.productSchema).toBe(true);
    expect(result.indicators.organizationSchema).toBe(true);
    expect(result.evidence.llmsTxtNote).toContain("proposed AI-readable content signal");
    expect(result.scores.overall).toBeGreaterThan(50);
  });

  it("blocks localhost and private IP audit targets", async () => {
    await expect(assertPublicAuditUrl("http://localhost:3000")).rejects.toThrow("blocked_private_target");
    await expect(assertPublicAuditUrl("http://127.0.0.1")).rejects.toThrow("blocked_private_target");
    await expect(assertPublicAuditUrl("http://10.1.2.3")).rejects.toThrow("blocked_private_target");
    await expect(assertPublicAuditUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow("blocked_private_target");
    await expect(assertPublicAuditUrl("http://[::1]/")).rejects.toThrow("blocked_private_target");
    await expect(assertPublicAuditUrl("http://[::ffff:127.0.0.1]/")).rejects.toThrow("blocked_private_target");
  });

  it("blocks unsafe redirects and excessive redirect chains", async () => {
    const resolver: SafeResolver = async () => [{ address: "93.184.216.34", family: 4 }];
    await expect(safeFetchText("http://example.test", {
      resolver,
      requester: async () => ({ ok: false, status: 302, url: "http://example.test", text: "", headers: { location: "http://127.0.0.1/admin" } })
    })).rejects.toMatchObject({ code: "blocked_redirect_target" });
    await expect(safeFetchText("http://example.test", {
      resolver,
      requester: async () => ({ ok: false, status: 302, url: "http://example.test", text: "", headers: { location: "http://169.254.169.254/latest/meta-data" } })
    })).rejects.toMatchObject({ code: "blocked_redirect_target" });
    await expect(safeFetchText("http://example.test/a", {
      resolver,
      maxRedirects: 1,
      requester: async (url) => ({ ok: false, status: 302, url: url.toString(), text: "", headers: { location: `/next-${url.pathname.length}` } })
    })).rejects.toMatchObject({ code: "too_many_redirects" });
  });

  it("blocks DNS rebinding through connection-time lookup validation", async () => {
    let calls = 0;
    const resolver: SafeResolver = async () => {
      calls += 1;
      return [{ address: calls === 1 ? "93.184.216.34" : "127.0.0.1", family: 4 }];
    };
    await expect(safeFetchText("http://rebind.test", { resolver, timeoutMs: 1000 })).rejects.toMatchObject({ code: "blocked_private_target" });
  });

  it("rejects oversized responses and times out safely", async () => {
    await expect(safeFetchText("http://example.test", {
      resolver: async () => [{ address: "93.184.216.34", family: 4 }],
      maxBytes: 4,
      requester: async () => {
        throw new SafeFetchError("response_too_large");
      }
    })).rejects.toMatchObject({ code: "response_too_large" });
    await expect(safeFetchText("http://example.test", {
      resolver: async () => [{ address: "93.184.216.34", family: 4 }],
      requester: async () => {
        throw new SafeFetchError("fetch_timeout");
      }
    })).rejects.toMatchObject({ code: "fetch_timeout" });
  });

  it("Studio site audit API requires auth before URL work", async () => {
    const response = await runAuditPost(new Request("http://localhost:3001/api/studio/site-audit/run", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("Studio site audit API safely rejects private URLs for authenticated users", async () => {
    setSupabaseUserVerifierForTests(async () => ({ id: "auth_user_01", email: "admin@saltycowhide.com", emailVerified: true }));
    setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({ id: user.id, email: user.email, role: "owner", workspaceId, supabaseUserId: user.id }));
    const response = await runAuditPost(authRequest({ websiteUrl: "http://localhost:3000" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ ok: false, status: "blocked" });
  });
});

describe("integration provider disabled states", () => {
  it("GA4, GSC, and Google Business Profile return not_configured without credentials", async () => {
    const providers = createIntegrationProviders(parseEnv({ APP_ENV: "development" }));
    await expect(providers.ga4.importMetrics()).resolves.toMatchObject({ ok: false, status: "not_configured" });
    await expect(providers.gsc.importSearchAnalytics()).resolves.toMatchObject({ ok: false, status: "not_configured" });
    await expect(providers.googleBusinessProfile.importProfile()).resolves.toMatchObject({ ok: false, status: "not_configured" });
  });
});

describe("storefront product safety", () => {
  it("demo product is labeled non-live and does not show fake ratings or bestseller claims", async () => {
    process.env.APP_ENV = "development";
    const html = renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ handle: "demo-product" }) }));
    expect(html).toContain("Development preview");
    expect(html).toContain("Checkout unavailable");
    expect(html).not.toMatch(/Bestseller|4\.9|★/);
  });

  it("demo product is hidden in production when not approved as a public projection", async () => {
    process.env.APP_ENV = "production";
    const html = renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ handle: "demo-product" }) }));
    expect(html).toContain("Product unavailable");
  });

  it("production storefront home does not render demo product cards or demo product links", async () => {
    process.env.APP_ENV = "production";
    const html = renderToStaticMarkup(await StorefrontHome());
    expect(html).toContain("No approved public products yet");
    expect(html).not.toMatch(/Sunset Vibes Tee|Coastal Cowboy Sweatshirt|href="\/products\/demo-product"/);
  });
});
