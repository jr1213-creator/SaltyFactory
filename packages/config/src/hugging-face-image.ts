export const HUGGING_FACE_IMAGE_PROVIDER = "hf-inference" as const;

export type HuggingFaceImageProviderId = typeof HUGGING_FACE_IMAGE_PROVIDER;

export type HuggingFaceImageValidationStatus =
  | "valid"
  | "token_missing"
  | "token_invalid"
  | "permission_missing"
  | "model_not_found"
  | "model_not_supported"
  | "model_gated"
  | "quota_or_billing"
  | "provider_unreachable"
  | "endpoint_misconfigured"
  | "unknown_provider_error";

export type HuggingFaceImageModelRecommendation = {
  id: string;
  model: string;
  provider: HuggingFaceImageProviderId;
  label: string;
  whyRecommended: string;
  setupNote: string;
};

export const recommendedHuggingFaceImageModels: HuggingFaceImageModelRecommendation[] = [
  {
    id: "black-forest-labs/FLUX.1-schnell",
    model: "black-forest-labs/FLUX.1-schnell",
    provider: HUGGING_FACE_IMAGE_PROVIDER,
    label: "FLUX.1 schnell",
    whyRecommended: "Current Hugging Face HF Inference text-to-image router model.",
    setupNote: "Start here for local validation and first production provider setup."
  },
  {
    id: "stabilityai/stable-diffusion-3-medium-diffusers",
    model: "stabilityai/stable-diffusion-3-medium-diffusers",
    provider: HUGGING_FACE_IMAGE_PROVIDER,
    label: "Stable Diffusion 3 Medium Diffusers",
    whyRecommended: "Current Stability-family model listed for the HF Inference text-to-image provider.",
    setupNote: "Use this instead of the older SDXL base model when choosing a Stability model."
  }
];

const knownUnsupportedByHfInference: Record<string, string> = {
  "stabilityai/stable-diffusion-xl-base-1.0": "The older SDXL base model is not on SaltyFactory's current HF Inference router allowlist. Try FLUX.1 schnell or Stable Diffusion 3 Medium Diffusers."
};

export function primaryHuggingFaceImageModel() {
  return recommendedHuggingFaceImageModels[0]!.model;
}

export function isRecommendedHuggingFaceImageModel(model: string) {
  return recommendedHuggingFaceImageModels.some((item) => item.model === model.trim());
}

export function unsupportedHuggingFaceImageModelReason(model: string) {
  return knownUnsupportedByHfInference[model.trim()] ?? null;
}

export function publicHuggingFaceImageModelRecommendations() {
  return recommendedHuggingFaceImageModels.map((item) => ({
    id: item.id,
    model: item.model,
    provider: item.provider,
    label: item.label,
    whyRecommended: item.whyRecommended,
    setupNote: item.setupNote
  }));
}
