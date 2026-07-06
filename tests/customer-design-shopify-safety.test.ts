import { afterEach, describe, expect, it, vi } from "vitest";
import { createRepositories } from "@saltyfactory/db";
import { GET as studioSessionsGet } from "../apps/studio/app/api/studio/customer-design/sessions/route";
import { POST as messagePost } from "../apps/storefront/app/api/store/customer-design/message/route";
import { POST as sessionPost } from "../apps/storefront/app/api/store/customer-design/session/route";
import { GET as sessionDetailGet } from "../apps/storefront/app/api/store/customer-design/session/[id]/route";

function stubSharedMemoryRuntime() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("APP_ENV", "development");
  vi.stubEnv("REPOSITORY_ADAPTER", "memory");
  vi.stubEnv("PLAYWRIGHT_AUTH_BYPASS", "true");
}

function jsonRequest(path: string, body: Record<string, unknown> | string) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("customer design route and provider safety", () => {
  it("rejects invalid JSON without persistence and keeps Shopify Admin token out of responses", async () => {
    stubSharedMemoryRuntime();
    vi.stubEnv("SHOPIFY_ADMIN_TOKEN", "shpat_secret_admin_token_should_not_echo");
    const repos = createRepositories();
    const before = await repos.customerDesign.sessions.listByWorkspace("wks_default");

    const invalid = await sessionPost(jsonRequest("/api/store/customer-design/session", "{"));
    expect(invalid.status).toBe(400);
    expect(await repos.customerDesign.sessions.listByWorkspace("wks_default")).toEqual(before);

    const created = await sessionPost(jsonRequest("/api/store/customer-design/session", { sourceRoute: "/store/custom" }));
    expect(created.status).toBe(200);
    const bodyText = await created.text();
    expect(bodyText).not.toContain("shpat_secret_admin_token_should_not_echo");
    expect(bodyText).not.toContain("session_token_hash");
    expect(bodyText).not.toContain("sessionTokenHash");
  });

  it("requires session token ownership and blocks cross-session reads", async () => {
    stubSharedMemoryRuntime();
    const first = await (await sessionPost(jsonRequest("/api/store/customer-design/session", { sourceRoute: "/store/custom" }))).json();
    const second = await (await sessionPost(jsonRequest("/api/store/customer-design/session", { sourceRoute: "/store/custom" }))).json();

    const wrongToken = await sessionDetailGet(new Request(`http://localhost:3000/api/store/customer-design/session/${first.session.id}`, {
      headers: { "x-customer-design-token": second.sessionToken }
    }), {
      params: Promise.resolve({ id: first.session.id })
    });
    expect(wrongToken.status).toBe(403);

    const rightToken = await sessionDetailGet(new Request(`http://localhost:3000/api/store/customer-design/session/${first.session.id}`, {
      headers: { "x-customer-design-token": first.sessionToken }
    }), {
      params: Promise.resolve({ id: first.session.id })
    });
    expect(rightToken.status).toBe(200);
    expect(await rightToken.text()).not.toContain("session_token_hash");

    const saved = await messagePost(jsonRequest("/api/store/customer-design/message", {
      sessionId: first.session.id,
      sessionToken: first.sessionToken,
      messageText: "I want a funny redfish shirt for Tampa Bay"
    }));
    expect(saved.status).toBe(200);
  });

  it("requires Studio auth for owner customer-design routes", async () => {
    const response = await studioSessionsGet(new Request("http://localhost:3001/api/studio/customer-design/sessions"));
    expect(response.status).toBe(401);
  });

  it("fails safely in production when storefront workspace is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ENV", "production");
    vi.stubEnv("STOREFRONT_WORKSPACE_ID", "");
    const response = await sessionPost(jsonRequest("/api/store/customer-design/session", { sourceRoute: "/store/custom" }));
    expect(response.status).toBe(503);
  });
});
