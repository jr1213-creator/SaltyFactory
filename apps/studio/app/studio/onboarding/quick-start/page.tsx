import { ConciergeHeader, ImageGenerationSetupForms, PrintifySetupForms, SetupCardGrid, ShopifySetupForms } from "../_components";
import { runtimeOwnerSetupCards } from "../_runtime-readiness";

export default async function QuickStartPage() {
  const cards = await runtimeOwnerSetupCards();
  return <div className="setup-command-page onboarding-command-page">
    <ConciergeHeader title="Quick Setup" description="A faster setup lane for owners who already have provider values. Secrets are still write-only, encrypted when credential storage is enabled, and validated server-side." />
    <SetupCardGrid cards={cards} providers={["image_generation", "printify", "shopify", "storage", "banking", "live_publish"]} />
    <section className="setup-section">
      <div className="setup-section-header">
        <div>
          <p className="eyebrow-label">Quick setup actions</p>
          <h2>Provider validation forms</h2>
          <p>These forms post to protected backend routes. If encrypted credential storage is unavailable, the backend refuses to store secrets and tells you what administrator setup is required.</p>
        </div>
      </div>
      <ImageGenerationSetupForms />
      <PrintifySetupForms />
      <ShopifySetupForms />
    </section>
  </div>;
}
