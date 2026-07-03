import { FieldGuides, ImageGenerationSetupForms, ProviderIntro, SetupCardGrid } from "../../_components";

export default function ImageGenerationSetupPage() {
  return <div className="setup-command-page onboarding-command-page">
    <ProviderIntro provider="image_generation" />
    <SetupCardGrid providers={["image_generation", "storage"]} />
    <ImageGenerationSetupForms />
    <FieldGuides providerKey="image_generation" />
  </div>;
}
