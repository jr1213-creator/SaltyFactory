import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { SUPABASE_ACCESS_COOKIE, setSupabaseUserVerifierForTests, setWorkspaceAuthorizerForTests } from "@saltyfactory/auth";
import {
  publicImageGenerationProviderResolution,
  resolveImageGenerationProvider
} from "@saltyfactory/ai-free";
import { applyImageGenerationRuntimeReadiness, buildFeatureReadiness, parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { createMemoryRepositories } from "../packages/db/src/repositories/memory";
import { encryptCredential } from "@saltyfactory/security";
import { POST as sendToGenerationPost } from "../apps/studio/app/api/studio/design-briefs/[id]/send-to-generation/route";
import ImageGenerationPage from "../apps/studio/app/studio/image-generation/page";
import ImageGenerationSetupPage from "../apps/studio/app/studio/onboarding/providers/image-generation/page";
import { BriefWorkflowClient } from "../apps/studio/app/studio/briefs/BriefWorkflowClient";

const originalEnv = { ...process.env };
const workspaceId = "wks_default";
const actorId = "runtime_owner";
const encryptionKey = "0123456789abcdef0123456789abcdef";
const model = "black-forest-labs/FLUX.1-schnell";

function authorizeAsOwner() {
  setSupabaseUserVerifierForTests(async (token) => token === "valid" ? { id: actorId, email: "owner@saltycowhide.com", emailVerified: true } : null);
  setWorkspaceAuthorizerForTests(async (user, authorizedWorkspaceId) => ({
    id: user.id,
    email: user.email,
    role: "owner",
    workspaceId: authorizedWorkspaceId,
    supabaseUserId: user.id
  }));
}

function authedPost(path: string) {
  return new Request(`http://localhost:3001${path}`, {
    method: "POST",
    headers: { cookie: `${SUPABASE_ACCESS_COOKIE}=valid` }
  });
}

async function pngBuffer() {
  return sharp({ create: { width: 64, height: 64, channels: 4, background: "#0f766e" } }).png().toBuffer();
}

async function seedConnectedImageProvider(repos: RepositoryBundle, token: string, imageModel = model) {
  const credentialRef = `cred_image_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await repos.integration.saveEncryptedCredential({
    id: `ecred_${credentialRef}`,
    workspace_id: workspaceId,
    provider_key: "image_generation",
    credential_ref: credentialRef,
    encrypted_payload: encryptCredential({
      secret: token,
      key: encryptionKey,
      provider: "image_generation",
      workspaceId,
      createdBy: actorId
    }),
    status: "active",
    created_by: actorId,
    updated_by: actorId
  });
  await repos.integration.createProviderConnection({
    id: `conn_image_${credentialRef}`,
    workspace_id: workspaceId,
    provider_type: "image_generation",
    provider_name: "Image Generation",
    enabled: true,
    status: "connected",
    secret_ref: credentialRef,
    configuration: {
      imageProvider: "hugging_face",
      hfProvider: "hf-inference",
      imageModel,
      maskedDisplayValue: "Saved securely"
    },
    created_by: actorId,
    updated_by: actorId
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

describe("image generation runtime resolver", () => {
  it("marks image readiness ready when Hugging Face is connected through credential storage", async () => {
    const repos = createMemoryRepositories();
    const token = "hf_runtime_secret_ready";
    const config = parseEnv({
      NODE_ENV: "development",
      APP_ENV: "development",
      CREDENTIAL_STORAGE_ENABLED: "true",
      CREDENTIAL_ENCRYPTION_KEY: encryptionKey
    });
    await seedConnectedImageProvider(repos as unknown as RepositoryBundle, token);

    const runtime = await resolveImageGenerationProvider({ workspaceId, repos: repos as unknown as RepositoryBundle, config });
    const publicRuntime = publicImageGenerationProviderResolution(runtime);
    const report = applyImageGenerationRuntimeReadiness(buildFeatureReadiness(config, {}, workspaceId), publicRuntime);
    const image = report.features.find((feature) => feature.featureKey === "imageGeneration")!;

    expect(runtime).toMatchObject({ status: "ready", provider: "huggingface", credentialSource: "credential_store", model });
    expect(image.status).toBe("ready");
    expect(image.setupRequired).toEqual([]);
    expect(image.requiredEnv).toEqual([]);
    expect(JSON.stringify(runtime)).not.toContain(token);
    expect(JSON.stringify(publicRuntime)).not.toContain(token);
  });

  it("does not require HF_API_TOKEN env when the credential-store provider is connected", async () => {
    const repos = createMemoryRepositories();
    const token = "hf_runtime_secret_no_env";
    const config = parseEnv({
      NODE_ENV: "development",
      APP_ENV: "development",
      CREDENTIAL_STORAGE_ENABLED: "true",
      CREDENTIAL_ENCRYPTION_KEY: encryptionKey,
      HF_API_TOKEN: "",
      HF_IMAGE_MODEL: ""
    });
    await seedConnectedImageProvider(repos as unknown as RepositoryBundle, token);

    const runtime = await resolveImageGenerationProvider({ workspaceId, repos: repos as unknown as RepositoryBundle, config });

    expect(runtime.status).toBe("ready");
    expect(runtime.credentialSource).toBe("credential_store");
    expect(runtime.serverCredential?.token).toBe(token);
    expect(JSON.stringify(publicImageGenerationProviderResolution(runtime))).not.toContain(token);
  });

  it("falls back to env only when no credential-store provider exists", async () => {
    const config = parseEnv({
      NODE_ENV: "development",
      APP_ENV: "development",
      AI_IMAGE_ENABLED: "true",
      HF_API_TOKEN: "hf_env_secret",
      HF_IMAGE_MODEL: model
    });
    const runtime = await resolveImageGenerationProvider({
      workspaceId,
      repos: createMemoryRepositories() as unknown as RepositoryBundle,
      config
    });

    expect(runtime).toMatchObject({ status: "ready", provider: "huggingface", credentialSource: "env", model });
    expect(JSON.stringify(runtime)).not.toContain("hf_env_secret");
  });

  it("returns setup_required state when no provider exists", async () => {
    const runtime = await resolveImageGenerationProvider({
      workspaceId,
      repos: createMemoryRepositories() as unknown as RepositoryBundle,
      config: parseEnv({ NODE_ENV: "development", APP_ENV: "development" })
    });

    expect(runtime.status).toBe("config_required");
    expect(runtime.setupAction).toBe("/studio/onboarding/providers/image-generation");
    expect(runtime.setupRequired.join(" ")).toContain("Connect Hugging Face");
  });

  it("allows local demo only outside production", async () => {
    const local = await resolveImageGenerationProvider({
      workspaceId,
      repos: createMemoryRepositories() as unknown as RepositoryBundle,
      config: parseEnv({
        NODE_ENV: "test",
        APP_ENV: "development",
        IMAGE_GENERATION_ENABLED: "true",
        IMAGE_GENERATION_PROVIDER: "local_dev_mock",
        LOCAL_DEV_IMAGE_GENERATION: "true"
      })
    });
    const production = await resolveImageGenerationProvider({
      workspaceId,
      repos: createMemoryRepositories() as unknown as RepositoryBundle,
      config: parseEnv({
        NODE_ENV: "production",
        APP_ENV: "production",
        IMAGE_GENERATION_ENABLED: "true",
        IMAGE_GENERATION_PROVIDER: "local_dev_mock",
        LOCAL_DEV_IMAGE_GENERATION: "true"
      })
    });

    expect(local).toMatchObject({ status: "local_demo", provider: "local_dev_mock", credentialSource: "local_demo" });
    expect(production).toMatchObject({ status: "invalid", blockingReasons: ["local_demo_blocked_in_production"] });
  });
});

describe("image generation runtime route and UI", () => {
  it("generation route uses credential-store token when connected and never echoes it", async () => {
    authorizeAsOwner();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
    vi.stubEnv("SUPABASE_URL", "https://supabase.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "supabase_service_role_test");
    vi.stubEnv("SUPABASE_PRIVATE_ASSETS_BUCKET", "private-assets");

    const repos = createRepositories();
    const token = "hf_route_secret_credential_store";
    const briefId = `brief_route_${Date.now()}`;
    await seedConnectedImageProvider(repos, token);
    await repos.brief.create({
      id: briefId,
      workspace_id: workspaceId,
      status: "approved",
      approved_for_generation: true,
      collection: "Runtime",
      product_targets: ["tee"],
      style_direction: { title: "Runtime brief", suggested_phrase: "Coastal Runtime Club", product_type: "tee", background_requirement: "transparent" },
      generation_prompt: "Original coastal western badge art.",
      negative_prompt: "logos",
      created_by: actorId,
      updated_by: actorId
    });

    const imageBytes = await pngBuffer();
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string | URL | Request, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes("router.huggingface.co")) {
        return new Response(imageBytes, { status: 200, headers: { "content-type": "image/png" } });
      }
      return new Response(JSON.stringify({ Key: "uploaded" }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await sendToGenerationPost(authedPost(`/api/studio/design-briefs/${briefId}/send-to-generation`), {
      params: Promise.resolve({ id: briefId })
    });
    const body = await response.json();
    const hfCall = calls.find((call) => call.url.includes("router.huggingface.co"));

    expect(response.status).toBe(200);
    expect(hfCall).toBeTruthy();
    expect(String((hfCall?.init.headers as Record<string, string>).authorization)).toBe(`Bearer ${token}`);
    expect(body.status).toBe("succeeded");
    expect(body.provider).toMatchObject({ provider: "huggingface", credentialSource: "credential_store", model });
    expect(JSON.stringify(body)).not.toContain(token);
    expect(logSpy.mock.calls.flat().join(" ")).not.toContain(token);
    expect(warnSpy.mock.calls.flat().join(" ")).not.toContain(token);
  });

  it("/studio/image-generation does not show disabled when provider is connected", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REPOSITORY_ADAPTER", "memory");
    vi.stubEnv("CREDENTIAL_STORAGE_ENABLED", "true");
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", encryptionKey);
    await seedConnectedImageProvider(createRepositories(), "hf_page_secret");

    const html = renderToStaticMarkup(await ImageGenerationPage());

    expect(html).toContain("Connected");
    expect(html).toContain("Hugging Face");
    expect(html).toContain("secure workspace credential");
    expect(html).toContain(model);
    expect(html).not.toContain("Disabled");
    expect(html).not.toContain("Requires AI_IMAGE_ENABLED");
  });

  it("recommended model list renders on image generation setup", async () => {
    const html = renderToStaticMarkup(await ImageGenerationSetupPage());

    expect(html).toContain("Model recommendations");
    expect(html).toContain("black-forest-labs/FLUX.1-schnell");
    expect(html).toContain("Try a recommended model");
  });

  it("/studio/briefs replaces raw JSON with a structured generation result panel", () => {
    const source = readFileSync("apps/studio/app/studio/briefs/BriefWorkflowClient.tsx", "utf8");
    const html = renderToStaticMarkup(createElement(BriefWorkflowClient, { initialBriefs: [] }));

    expect(source).not.toContain("JSON.stringify(result");
    expect(source).toContain("Open image generation setup");
    expect(source).toContain("Request setup help");
    expect(source).toContain("Try a recommended model");
    expect(html).not.toContain("<pre");
  });
});
