import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { safeProductProjection } from "@saltyfactory/commerce";
import { redactConfig, parseEnv } from "@saltyfactory/config";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (["node_modules", ".next", "dist"].includes(entry)) return [];
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx|js|json|env|example)$/.test(entry) ? [path] : [];
  });
}

describe("provider token exposure", () => {
  it("Shopify Admin token never appears in client-facing output", () => {
    const projection = safeProductProjection({ id: "p1", title: "Tee", description: "Desc", shopify_admin_token: "secret" });
    expect(JSON.stringify(projection)).not.toContain("secret");
  });

  it("Printify and HuggingFace tokens are redacted from config output", () => {
    const redacted = redactConfig(parseEnv({ PRINTIFY_API_TOKEN: "printify_secret", HF_API_TOKEN: "hf_secret", NEXT_PUBLIC_STOREFRONT_BASE_URL: "https://saltycowhide.com" }));
    expect(JSON.stringify(redacted)).not.toContain("printify_secret");
    expect(JSON.stringify(redacted)).not.toContain("hf_secret");
  });

  it("client code does not reference server secret env vars", () => {
    const clientFiles = sourceFiles(join(process.cwd(), "apps")).filter((file) => file.includes(`${join("apps", "storefront")}`) || file.includes(`${join("apps", "studio")}`));
    const text = clientFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(text).not.toMatch(/NEXT_PUBLIC_(SHOPIFY_ADMIN_TOKEN|SHOPIFY_CLIENT_SECRET|PRINTIFY_API_TOKEN|HF_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY)/);
  });
});
