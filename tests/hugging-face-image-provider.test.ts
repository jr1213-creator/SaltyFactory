import { describe, expect, it } from "vitest";
import { classifyHuggingFaceImageProviderError, huggingFaceImageRouterEndpoint } from "@saltyfactory/ai-free";

describe("Hugging Face image provider error mapping", () => {
  it("uses the current hf-inference router endpoint format", () => {
    expect(huggingFaceImageRouterEndpoint("black-forest-labs/FLUX.1-schnell")).toBe(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
    );
  });

  it("classifies gated model, quota, endpoint, and router failures", () => {
    expect(classifyHuggingFaceImageProviderError({
      httpStatus: 403,
      body: { error: "Access to model is gated. Accept the model terms." }
    }).status).toBe("model_gated");

    expect(classifyHuggingFaceImageProviderError({
      httpStatus: 402,
      body: { error: "Insufficient credits for Inference Providers billing." }
    }).status).toBe("quota_or_billing");

    expect(classifyHuggingFaceImageProviderError({
      httpStatus: 405,
      body: "Cannot POST this endpoint"
    }).status).toBe("endpoint_misconfigured");

    expect(classifyHuggingFaceImageProviderError({
      httpStatus: 503,
      body: { error: "HF router unavailable" }
    }).status).toBe("unknown_provider_error");
  });

  it("maps raw fetch failed to provider_unreachable without returning the raw phrase", () => {
    const result = classifyHuggingFaceImageProviderError({ error: new Error("fetch failed") });

    expect(result.status).toBe("provider_unreachable");
    expect(result.safeMessage).not.toContain("fetch failed");
  });
});
