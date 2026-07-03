import { ConciergeHeader, SetupCardGrid } from "../_components";

export default function ProviderSetupIndexPage() {
  return <div className="setup-command-page onboarding-command-page">
    <ConciergeHeader title="Provider Setup" description="Connect the provider services SaltyFactory needs for real image generation, Printify product creation, Shopify drafts, storage, and safe owner-gated launch review." />
    <SetupCardGrid providers={["image_generation", "printify", "shopify", "storage", "banking", "external_orders", "live_publish"]} />
  </div>;
}
