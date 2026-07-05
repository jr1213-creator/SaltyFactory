import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Ollama agent smoke harness", () => {
  it("is registered as an opt-in package script", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts["smoke:ollama-agent-local"]).toBe("tsx scripts/smoke-ollama-agent-local.ts");
  });

  it("requires explicit RUN_LOCAL_OLLAMA_AGENT_SMOKE guard and prints safe proof only", () => {
    const source = readFileSync("scripts/smoke-ollama-agent-local.ts", "utf8");
    expect(source).toContain("RUN_LOCAL_OLLAMA_AGENT_SMOKE");
    expect(source).toContain("/api/chat");
    expect(source).toContain("agentRunId");
    expect(source).toContain("transcriptEventCount");
    expect(source).toContain("fixture_setup_failed");
    expect(source).toContain("prepareOllamaSmokeDraft");
    expect(source).not.toMatch(/Authorization|Bearer|service_role|SUPABASE_SERVICE_ROLE_KEY|PRINTIFY_API_TOKEN|HF_API_TOKEN/);
  });
});
