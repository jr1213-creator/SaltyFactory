import { publicImageGenerationProviderResolution, resolveImageGenerationProvider } from "@saltyfactory/ai-free";
import { publicPrintifyProviderResolution, resolvePrintifyProvider } from "@saltyfactory/commerce";
import { applyImageGenerationRuntimeReadiness, applyPrintifyRuntimeReadiness, applyStorageRuntimeReadiness, buildFeatureReadiness, buildOwnerSetupCards, parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { checkStorageReadiness } from "@saltyfactory/storage";
import { studioWorkspaceId } from "../../api/studio/design-suggestions/_shared";

function canOpenRepositories() {
  return process.env.NODE_ENV === "test" || process.env.REPOSITORY_ADAPTER === "memory" || Boolean(process.env.DATABASE_URL) || process.env.APP_ENV === "production";
}

export function openOnboardingRepositoriesSafely(): RepositoryBundle | undefined {
  if (!canOpenRepositories()) return undefined;
  try {
    return createRepositories();
  } catch {
    return undefined;
  }
}

export async function runtimeOwnerSetupCards() {
  const config = parseEnv();
  const repos = openOnboardingRepositoriesSafely();
  const image = await resolveImageGenerationProvider({ workspaceId: studioWorkspaceId, repos, config });
  const printify = await resolvePrintifyProvider({ workspaceId: studioWorkspaceId, repos, config });
  const storage = await checkStorageReadiness(config);
  const report = applyPrintifyRuntimeReadiness(
    applyImageGenerationRuntimeReadiness(
      applyStorageRuntimeReadiness(buildFeatureReadiness(config, process.env, studioWorkspaceId), storage),
      publicImageGenerationProviderResolution(image)
    ),
    publicPrintifyProviderResolution(printify)
  );
  return buildOwnerSetupCards(report);
}
