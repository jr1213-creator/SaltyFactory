import { describe, expect, it } from "vitest";
import { forbiddenAiActions, neverAutonomousTaskTypes, productListingAssistantTools, registryHasForbiddenToolNames } from "@saltyfactory/ai-free";

describe("agent tool registry safety", () => {
  it("exposes only allowlisted product listing assistant tools", () => {
    expect(productListingAssistantTools.map((tool) => tool.name).sort()).toEqual([
      "get_asset_quality_summary",
      "get_mockup_summary",
      "get_product_draft_summary",
      "get_publish_readiness_summary",
      "save_product_listing_draft_output"
    ].sort());
    expect(productListingAssistantTools.every((tool) => tool.allowedRoles.includes("product_listing_assistant"))).toBe(true);
  });

  it("does not contain publish, provider mutation, spend, send, delete, credential, shell, filesystem, http, or sql tools", () => {
    expect(registryHasForbiddenToolNames()).toEqual([]);
    const names = productListingAssistantTools.map((tool) => tool.name).join(" ");
    expect(names).not.toMatch(/publish_live|publish_product|go_live|shopify_publish|printify_create|printify_upload|send_email|delete|spend|credential|provider_sync|qa_override|shell|filesystem|sql|http_fetch/i);
  });

  it("does not overlap forbidden AI actions or never-autonomous task types", () => {
    const names = new Set(productListingAssistantTools.map((tool) => tool.name));
    for (const forbidden of [...forbiddenAiActions, ...neverAutonomousTaskTypes]) {
      expect(names.has(forbidden)).toBe(false);
    }
  });
});
