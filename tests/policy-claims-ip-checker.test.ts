import { describe, expect, it } from "vitest";
import { runRuleBasedPolicyClaimsIpCheck } from "@saltyfactory/ai-free";

describe("Policy / Claims / IP Risk Checker", () => {
  it("blocks protected terms and official/licensed/inspired-by/dupe claims", () => {
    const result = runRuleBasedPolicyClaimsIpCheck("Official licensed Disney Barbie inspired by Taylor Swift dupe.");

    expect(result.blocked).toBe(true);
    expect(result.verdict).toBe("blocked");
    expect(result.severity).toBe("critical");
    expect(result.policyCodes).toEqual(expect.arrayContaining([
      "protected_ip_term",
      "official_licensed_authentic_claim",
      "inspired_by_or_dupe"
    ]));
    expect(result.fixSuggestions.join(" ")).toMatch(/Remove protected|authorization|affiliation/i);
  });

  it("blocks unsupported claims, fake urgency, fake proof, and sensitive personal-attribute language", () => {
    const result = runRuleBasedPolicyClaimsIpCheck(
      "Are you a 40+ woman who needs this genuine leather waterproof customer favorite? Only 2 left."
    );

    expect(result.blocked).toBe(true);
    expect(result.policyCodes).toEqual(expect.arrayContaining([
      "sensitive_personal_attribute",
      "false_material_claim",
      "fake_social_proof",
      "fake_urgency"
    ]));
    expect(result.fixSuggestions).toEqual(expect.arrayContaining([
      expect.stringContaining("Avoid direct personal-attribute ad copy"),
      expect.stringContaining("Remove material"),
      expect.stringContaining("Remove scarcity")
    ]));
  });

  it("blocks shame, fear, insecurity, counterfeit, and song lyric risk", () => {
    const result = runRuleBasedPolicyClaimsIpCheck("Use this counterfeit song lyric design to stop looking cheap and fix your body.");

    expect(result.blocked).toBe(true);
    expect(result.policyCodes).toEqual(expect.arrayContaining([
      "inspired_by_or_dupe",
      "song_lyrics",
      "shame_fear_manipulation"
    ]));
    expect(result.fixSuggestions.join(" ")).toMatch(/original product positioning|song lyrics|shame/i);
  });

  it("passes safe owner-reviewed style context", () => {
    const result = runRuleBasedPolicyClaimsIpCheck("For shoppers who love coastal western style, review this giftable charm before manual launch.");

    expect(result).toMatchObject({
      verdict: "pass",
      blocked: false,
      severity: "low",
      policyCodes: []
    });
  });
});
