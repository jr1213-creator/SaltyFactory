import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import { checkStorageReadiness } from "@saltyfactory/storage";
import { GET as storageReadinessGet } from "../apps/studio/app/api/studio/config/storage-readiness/route";
import StudioSetupPage from "../apps/studio/app/studio/setup/page";
import ImageGenerationSetupPage from "../apps/studio/app/studio/onboarding/providers/image-generation/page";

const originalEnv = { ...process.env };

function authorizeAsOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: "storage_owner", email: "owner@saltycowhide.com", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, workspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId,
    supabaseUserId: user.id
  }));
}

function authedGet(path = "/api/studio/config/storage-readiness", token = "valid") {
  return new Request(`http://localhost:3001${path}`, {
    method: "GET",
    headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=${token}` }
  });
}

function storageFetch(options: { privateBucket?: boolean; publicBucket?: boolean; write?: boolean; remove?: boolean } = {}) {
  const privateBucket = options.privateBucket ?? true;
  const publicBucket = options.publicBucket ?? true;
  const write = options.write ?? true;
  const remove = options.remove ?? true;
  return vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    const text = String(url);
    if (text.includes("/storage/v1/bucket")) {
      return Response.json([
        ...(privateBucket ? [{ name: "private-assets" }] : []),
        ...(publicBucket ? [{ name: "public-assets" }] : [])
      ]);
    }
    if (text.includes("/storage/v1/object/private-assets") && init.method === "DELETE") {
      return new Response(JSON.stringify([]), { status: remove ? 200 : 403, headers: { "content-type": "application/json" } });
    }
    if (text.includes("/storage/v1/object/private-assets")) {
      return new Response(JSON.stringify({ Key: "diagnostic" }), { status: write ? 200 : 403, headers: { "content-type": "application/json" } });
    }
    return new Response("not found", { status: 404 });
  });
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setSupabaseUserVerifierForTests(null);
  setWorkspaceAuthorizerForTests(null);
});

describe("storage readiness diagnostic", () => {
  it("reports configured storage with bucket, write, and delete checks", async () => {
    const secret = "supabase_service_role_should_not_leak";
    const diagnostic = await checkStorageReadiness({
      SUPABASE_URL: "https://supabase.test",
      SUPABASE_SERVICE_ROLE_KEY: secret,
      SUPABASE_PRIVATE_ASSETS_BUCKET: "private-assets",
      SUPABASE_PUBLIC_ASSETS_BUCKET: "public-assets"
    }, storageFetch());

    expect(diagnostic.ok).toBe(true);
    expect(diagnostic.environment.SUPABASE_URL.present).toBe(true);
    expect(diagnostic.environment.SUPABASE_SERVICE_ROLE_KEY.present).toBe(true);
    expect(diagnostic.environment.SUPABASE_PRIVATE_ASSETS_BUCKET.name).toBe("private-assets");
    expect(diagnostic.environment.SUPABASE_PUBLIC_ASSETS_BUCKET.name).toBe("public-assets");
    expect(diagnostic.checks).toMatchObject({
      canCreateSupabaseAdminClient: true,
      privateBucketExists: true,
      publicBucketExists: true,
      canWriteTestObjectToPrivateBucket: true,
      canDeleteTestObject: true
    });
    expect(JSON.stringify(diagnostic)).not.toContain(secret);
  });

  it("reports missing service role key without calling Supabase", async () => {
    const fetcher = storageFetch();
    const diagnostic = await checkStorageReadiness({
      SUPABASE_URL: "https://supabase.test",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SUPABASE_PRIVATE_ASSETS_BUCKET: "private-assets",
      SUPABASE_PUBLIC_ASSETS_BUCKET: "public-assets"
    }, fetcher);

    expect(diagnostic.ok).toBe(false);
    expect(diagnostic.environment.SUPABASE_SERVICE_ROLE_KEY.present).toBe(false);
    expect(diagnostic.checks.canCreateSupabaseAdminClient).toBe(false);
    expect(diagnostic.setupRequired.join(" ")).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports a missing private bucket before write/delete checks", async () => {
    const fetcher = storageFetch({ privateBucket: false, publicBucket: true });
    const diagnostic = await checkStorageReadiness({
      SUPABASE_URL: "https://supabase.test",
      SUPABASE_SERVICE_ROLE_KEY: "supabase_service_role_should_not_leak",
      SUPABASE_PRIVATE_ASSETS_BUCKET: "private-assets",
      SUPABASE_PUBLIC_ASSETS_BUCKET: "public-assets"
    }, fetcher);

    expect(diagnostic.ok).toBe(false);
    expect(diagnostic.checks.privateBucketExists).toBe(false);
    expect(diagnostic.checks.publicBucketExists).toBe(true);
    expect(diagnostic.checks.canWriteTestObjectToPrivateBucket).toBe(false);
    expect(diagnostic.setupRequired.join(" ")).toContain("Create private assets bucket private-assets.");
    expect(fetcher.mock.calls.some((call) => String(call[0]).includes("/storage/v1/object/private-assets"))).toBe(false);
  });

  it("requires auth and never returns the service role key", async () => {
    const secret = "supabase_service_role_route_should_not_leak";
    const unauthenticated = await storageReadinessGet(new Request("http://localhost:3001/api/studio/config/storage-readiness"));
    expect(unauthenticated.status).toBe(401);

    authorizeAsOwner();
    vi.stubEnv("SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", secret);
    vi.stubEnv("SUPABASE_PRIVATE_ASSETS_BUCKET", "private-assets");
    vi.stubEnv("SUPABASE_PUBLIC_ASSETS_BUCKET", "public-assets");
    vi.stubGlobal("fetch", storageFetch());

    const response = await storageReadinessGet(authedGet());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.environment.SUPABASE_SERVICE_ROLE_KEY.present).toBe(true);
    expect(JSON.stringify(body)).not.toContain(secret);
  });

  it("renders owner-safe storage diagnostics on setup and image generation onboarding", async () => {
    const secret = "supabase_service_role_ui_should_not_leak";
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", secret);
    vi.stubEnv("SUPABASE_PRIVATE_ASSETS_BUCKET", "private-assets");
    vi.stubEnv("SUPABASE_PUBLIC_ASSETS_BUCKET", "public-assets");
    vi.stubGlobal("fetch", storageFetch());

    const setupHtml = renderToStaticMarkup(await StudioSetupPage());
    const imageSetupHtml = renderToStaticMarkup(await ImageGenerationSetupPage());

    for (const html of [setupHtml, imageSetupHtml]) {
      expect(html).toContain("Generated asset storage readiness");
      expect(html).toContain("Private bucket:");
      expect(html).toContain("private-assets");
      expect(html).toContain("Can write a test object to private storage");
      expect(html).toContain("/api/studio/config/storage-readiness");
      expect(html).not.toContain(secret);
    }
  });
});
