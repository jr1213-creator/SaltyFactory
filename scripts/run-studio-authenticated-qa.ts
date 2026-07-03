import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createStudioE2eStorageState } from "./create-studio-e2e-storage-state";

async function main() {
  const storageState = resolve(process.env.STUDIO_E2E_STORAGE_STATE || "test-results/studio-auth-state.json");
  if (!existsSync(storageState)) {
    await createStudioE2eStorageState();
  }

  const result = spawnSync("corepack", ["pnpm", "frontend:qa"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      STUDIO_E2E_STORAGE_STATE: storageState,
      STUDIO_E2E_SCREENSHOTS: process.env.STUDIO_E2E_SCREENSHOTS || "true"
    }
  });

  process.exitCode = result.status ?? 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
