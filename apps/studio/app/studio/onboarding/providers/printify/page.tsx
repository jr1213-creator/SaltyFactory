import { FieldGuides, PrintifySetupForms, ProviderIntro, SetupCardGrid } from "../../_components";

export default function PrintifySetupPage() {
  return <div className="setup-command-page onboarding-command-page">
    <ProviderIntro provider="printify" />
    <SetupCardGrid providers={["printify"]} />
    <PrintifySetupForms />
    <FieldGuides providerKey="printify" />
  </div>;
}
