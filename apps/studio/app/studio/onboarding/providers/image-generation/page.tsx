import { publicImageGenerationProviderResolution, resolveImageGenerationProvider } from "@saltyfactory/ai-free";
import { applyImageGenerationRuntimeReadiness, applyStorageRuntimeReadiness, buildFeatureReadiness, buildOwnerSetupCards, parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { checkStorageReadiness } from "@saltyfactory/storage";
import { studioWorkspaceId } from "../../../../api/studio/design-suggestions/_shared";
import { StorageReadinessPanel } from "../../../StorageReadinessPanel";
import { FieldGuides, ImageGenerationSetupForms, ProviderIntro, SetupCardGrid } from "../../_components";

function canOpenRepositories() {
  return process.env.NODE_ENV === "test" || process.env.REPOSITORY_ADAPTER === "memory" || Boolean(process.env.DATABASE_URL) || process.env.APP_ENV === "production";
}

function openRepositoriesSafely(): RepositoryBundle | undefined {
  if (!canOpenRepositories()) return undefined;
  try {
    return createRepositories();
  } catch {
    return undefined;
  }
}

export default async function ImageGenerationSetupPage() {
  const config = parseEnv();
  const repos = openRepositoriesSafely();
  const provider = await resolveImageGenerationProvider({ workspaceId: studioWorkspaceId, repos, config });
  const storageDiagnostic = await checkStorageReadiness(config);
  const report = applyImageGenerationRuntimeReadiness(
    applyStorageRuntimeReadiness(buildFeatureReadiness(config, process.env, studioWorkspaceId), storageDiagnostic),
    publicImageGenerationProviderResolution(provider)
  );
  return <div className="setup-command-page onboarding-command-page">
    <ProviderIntro provider="image_generation" />
    <SetupCardGrid cards={buildOwnerSetupCards(report)} providers={["image_generation", "storage"]} />
    <StorageReadinessPanel diagnostic={storageDiagnostic} />
    <ImageGenerationSetupForms />
    <FieldGuides providerKey="image_generation" />
  </div>;
}
