import { FieldGuides, ProviderIntro, SetupCardGrid, ShopifySetupForms } from "../../_components";

export default function ShopifySetupPage() {
  return <div className="setup-command-page onboarding-command-page">
    <ProviderIntro provider="shopify" />
    <SetupCardGrid providers={["shopify", "live_publish"]} />
    <ShopifySetupForms />
    <FieldGuides providerKey="shopify" />
  </div>;
}
