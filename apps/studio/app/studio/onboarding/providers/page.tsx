import { ConciergeHeader, SetupCardGrid } from "../_components";
import { runtimeOwnerSetupCards } from "../_runtime-readiness";

export default async function ProviderSetupIndexPage() {
  const cards = await runtimeOwnerSetupCards();
  return <div className="setup-command-page onboarding-command-page">
    <ConciergeHeader title="Provider Setup" description="Connect the provider services SaltyFactory needs for real image generation, Printify product creation, Shopify drafts, storage, and safe owner-gated launch review." />
    <SetupCardGrid cards={cards} providers={["image_generation", "printify", "shopify", "storage", "banking", "external_orders", "live_publish"]} />
  </div>;
}
