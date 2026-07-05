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
  generationCapabilities: HuggingFaceImageGenerationCapabilities;
};

export type HuggingFaceImageGenerationCapabilities = {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  dimensionMultiple: number;
  supportsTransparentBackground: boolean;
  supportedParameters: string[];
};

const hfInferenceDefaultCapabilities: HuggingFaceImageGenerationCapabilities = {
  minWidth: 256,
  minHeight: 256,
  maxWidth: 1024,
  maxHeight: 1024,
  dimensionMultiple: 8,
  supportsTransparentBackground: false,
  supportedParameters: ["negative_prompt", "width", "height", "guidance_scale", "num_inference_steps", "seed", "scheduler"]
};

export const recommendedHuggingFaceImageModels: HuggingFaceImageModelRecommendation[] = [
  {
    id: "black-forest-labs/FLUX.1-schnell",
    model: "black-forest-labs/FLUX.1-schnell",
    provider: HUGGING_FACE_IMAGE_PROVIDER,
    label: "FLUX.1 schnell",
    whyRecommended: "Current Hugging Face HF Inference text-to-image router model.",
    setupNote: "Start here for local validation and first production provider setup.",
    generationCapabilities: hfInferenceDefaultCapabilities
  },
  {
    id: "stabilityai/stable-diffusion-3-medium-diffusers",
    model: "stabilityai/stable-diffusion-3-medium-diffusers",
    provider: HUGGING_FACE_IMAGE_PROVIDER,
    label: "Stable Diffusion 3 Medium Diffusers",
    whyRecommended: "Current Stability-family model listed for the HF Inference text-to-image provider.",
    setupNote: "Use this instead of the older SDXL base model when choosing a Stability model.",
    generationCapabilities: hfInferenceDefaultCapabilities
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

export function huggingFaceImageModelCapabilities(model: string) {
  return recommendedHuggingFaceImageModels.find((item) => item.model === model.trim())?.generationCapabilities ?? hfInferenceDefaultCapabilities;
}

export function validateHuggingFaceImageGenerationRequest(input: {
  model: string;
  width?: unknown;
  height?: unknown;
  transparentBackground?: unknown;
  parameters?: Record<string, unknown>;
}) {
  const unsupportedReason = unsupportedHuggingFaceImageModelReason(input.model);
  if (unsupportedReason) {
    return { ok: false as const, status: "model_not_supported" as const, safeMessage: unsupportedReason };
  }

  const capabilities = huggingFaceImageModelCapabilities(input.model);
  const parameters = input.parameters ?? {};
  const width = Number(input.width ?? parameters.width);
  const height = Number(input.height ?? parameters.height);
  const transparentBackground = input.transparentBackground === true || parameters.transparent_background === true || parameters.transparentBackground === true;
  const unsupportedParameters = Object.keys(parameters)
    .filter((key) => parameters[key] !== undefined && parameters[key] !== null)
    .filter((key) => key !== "transparent_background" && key !== "transparentBackground")
    .filter((key) => !capabilities.supportedParameters.includes(key));

  if (unsupportedParameters.length) {
    return {
      ok: false as const,
      status: "model_not_supported" as const,
      safeMessage: `The selected Hugging Face model/provider path does not support these generation options: ${unsupportedParameters.join(", ")}.`
    };
  }

  if (Number.isFinite(width)) {
    if (width < capabilities.minWidth || width > capabilities.maxWidth || width % capabilities.dimensionMultiple !== 0) {
      return {
        ok: false as const,
        status: "model_not_supported" as const,
        safeMessage: `The selected Hugging Face model/provider path supports image widths from ${capabilities.minWidth} to ${capabilities.maxWidth}px in ${capabilities.dimensionMultiple}px increments.`
      };
    }
  }

  if (Number.isFinite(height)) {
    if (height < capabilities.minHeight || height > capabilities.maxHeight || height % capabilities.dimensionMultiple !== 0) {
      return {
        ok: false as const,
        status: "model_not_supported" as const,
        safeMessage: `The selected Hugging Face model/provider path supports image heights from ${capabilities.minHeight} to ${capabilities.maxHeight}px in ${capabilities.dimensionMultiple}px increments.`
      };
    }
  }

  if (transparentBackground && !capabilities.supportsTransparentBackground) {
    return {
      ok: false as const,
      status: "model_not_supported" as const,
      safeMessage: "The selected Hugging Face text-to-image model cannot guarantee transparent-background output. Run background removal/print processing before treating the asset as transparent print art."
    };
  }

  return { ok: true as const, capabilities };
}

export function publicHuggingFaceImageModelRecommendations() {
  return recommendedHuggingFaceImageModels.map((item) => ({
    id: item.id,
    model: item.model,
    provider: item.provider,
    label: item.label,
    whyRecommended: item.whyRecommended,
    setupNote: item.setupNote,
    generationCapabilities: item.generationCapabilities
  }));
}
