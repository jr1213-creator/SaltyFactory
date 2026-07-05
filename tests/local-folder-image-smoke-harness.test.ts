import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("local folder image smoke harness", () => {
  it("registers the package script", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts["smoke:local-folder-image-import"]).toBe("tsx scripts/smoke-local-folder-image-import.ts");
  });

  it("guards execution behind RUN_LOCAL_FOLDER_IMAGE_SMOKE", () => {
    const source = readFileSync("scripts/smoke-local-folder-image-import.ts", "utf8");
    expect(source).toContain('RUN_LOCAL_FOLDER_IMAGE_SMOKE');
    expect(source).toContain('IMAGE_GENERATION_PROVIDER');
    expect(source).toContain('local_folder');
    expect(source).toContain('hfCalled: false');
    expect(source).toContain('printifyCalled: false');
    expect(source).toContain('shopifyCalled: false');
    expect(source).toContain('test-results');
    expect(source).toContain('local-folder-image-import');
  });
});
