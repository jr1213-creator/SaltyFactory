export type ImageGenerationProviderKey = "disabled" | "local_dev_mock" | "hugging_face";

export type ImageGenerationProviderState = {
  key: ImageGenerationProviderKey;
  enabled: boolean;
  status: "provider_disabled" | "not_configured" | "ready" | "blocked";
  model: string;
  blockingReasons: string[];
};

export function resolveImageGenerationProvider(env: NodeJS.ProcessEnv = process.env): ImageGenerationProviderState {
  const enabled = env.IMAGE_GENERATION_ENABLED === "true";
  const key = (env.IMAGE_GENERATION_PROVIDER || "disabled") as ImageGenerationProviderKey;
  const production = env.APP_ENV === "production" || env.NODE_ENV === "production";
  if (!enabled || key === "disabled") {
    return { key: "disabled", enabled: false, status: "provider_disabled", model: "none", blockingReasons: ["image_generation_disabled"] };
  }
  if (key === "local_dev_mock") {
    if (production) {
      return { key, enabled: false, status: "blocked", model: "local-dev-fixture", blockingReasons: ["local_dev_image_generation_blocked_in_production"] };
    }
    if (env.LOCAL_DEV_IMAGE_GENERATION !== "true") {
      return { key, enabled: false, status: "not_configured", model: "local-dev-fixture", blockingReasons: ["LOCAL_DEV_IMAGE_GENERATION_false"] };
    }
    return { key, enabled: true, status: "ready", model: "local-dev-fixture", blockingReasons: [] };
  }
  if (key === "hugging_face") {
    const model = env.HUGGING_FACE_IMAGE_MODEL || env.HF_IMAGE_MODEL || "";
    const token = env.HUGGING_FACE_API_TOKEN || env.HF_API_TOKEN || "";
    if (!model || !token) {
      return { key, enabled: false, status: "not_configured", model: model || "missing_model", blockingReasons: ["hugging_face_token_or_model_missing"] };
    }
    if (model === "stabilityai/stable-diffusion-xl-base-1.0") {
      return {
        key,
        enabled: false,
        status: "blocked",
        model,
        blockingReasons: [
          "model_not_supported",
          "try_model:black-forest-labs/FLUX.1-schnell",
          "try_model:stabilityai/stable-diffusion-3-medium-diffusers"
        ]
      };
    }
    const privateStorageConfigured = Boolean((env.SUPABASE_URL || "") && (env.SUPABASE_SERVICE_ROLE_KEY || "") && (env.SUPABASE_PRIVATE_ASSETS_BUCKET || env.SUPABASE_STORAGE_BUCKET || ""));
    if (production && !privateStorageConfigured) {
      return { key, enabled: false, status: "not_configured", model, blockingReasons: ["private_storage_not_configured"] };
    }
    return { key, enabled: true, status: "ready", model, blockingReasons: [] };
  }
  return { key: "disabled", enabled: false, status: "provider_disabled", model: "none", blockingReasons: ["unknown_image_generation_provider"] };
}
