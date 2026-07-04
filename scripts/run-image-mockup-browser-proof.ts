import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const screenshotDir = resolve(process.env.IMAGE_MOCKUP_BROWSER_PROOF_DIR || "test-results/image-mockup-browser-proof");
const baseUrl = process.env.STUDIO_E2E_BASE_URL || "http://localhost:3001";
const proofEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: "test",
  APP_ENV: "test",
  REPOSITORY_ADAPTER: "memory",
  PLAYWRIGHT_AUTH_BYPASS: "true",
  IMAGE_GENERATION_ENABLED: "true",
  IMAGE_GENERATION_PROVIDER: "local_dev_mock",
  LOCAL_DEV_IMAGE_GENERATION: "true",
  IMAGE_MOCKUP_BROWSER_PROOF_DIR: screenshotDir,
  STUDIO_E2E_BASE_URL: baseUrl,
  STUDIO_E2E_EXTERNAL_SERVER: "true"
};

async function waitForStudio() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    try {
      const response = await fetch(`${baseUrl}/login`, { signal: controller.signal });
      if (response.ok) return;
    } catch {
      // Keep waiting while Next starts.
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
  }
  throw new Error(`Studio dev server did not become ready at ${baseUrl}/login`);
}

function stopServer(child: ChildProcess) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

async function main() {
  console.log(`Starting Studio browser proof server at ${baseUrl}`);
  const server = spawn("corepack", ["pnpm", "dev:studio"], {
    shell: process.platform === "win32",
    env: proofEnv,
    stdio: ["ignore", "pipe", "pipe"]
  }) as ChildProcess;

  server.stdout?.on("data", (chunk: Buffer) => process.stdout.write(chunk));
  server.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));

  try {
    console.log("Waiting for Studio /login...");
    await waitForStudio();
    console.log("Studio ready; running image/mockup browser proof.");
    const result = spawnSync("corepack", ["pnpm", "exec", "playwright", "test", "e2e/image-mockup-browser-proof.spec.ts"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: proofEnv
    });
    process.exitCode = result.status ?? 1;
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
