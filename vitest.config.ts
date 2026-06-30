import { defineConfig } from "vitest/config";
import path from "node:path";
const r = (p: string) => path.resolve(__dirname, p);
export default defineConfig({
  resolve: { alias: {
    "@saltyfactory/domain": r("packages/domain/src/index.ts"),
    "@saltyfactory/config": r("packages/config/src/index.ts"),
    "@saltyfactory/db": r("packages/db/src/index.ts"),
    "@saltyfactory/storage": r("packages/storage/src/index.ts"),
    "@saltyfactory/commerce": r("packages/commerce/src/index.ts"),
    "@saltyfactory/ai-free": r("packages/ai-free/src/index.ts"),
    "@saltyfactory/image-pipeline": r("packages/image-pipeline/src/index.ts"),
    "@saltyfactory/risk": r("packages/risk/src/index.ts"),
    "@saltyfactory/queue": r("packages/queue/src/index.ts"),
    "@saltyfactory/auth": r("packages/auth/src/index.ts"),
    "@saltyfactory/ui": r("packages/ui/src/index.tsx")
  }},
  test: { environment: "node", include: ["tests/**/*.test.ts", "packages/**/*.test.ts", "apps/**/*.test.ts"] }
});