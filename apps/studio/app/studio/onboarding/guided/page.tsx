import { ConciergeHeader, GuidedStepList, SetupSafetyPanel } from "../_components";

export default function GuidedSetupPage() {
  return <div className="setup-command-page onboarding-command-page">
    <ConciergeHeader title="Guided Launch Setup" description="A step-by-step concierge path from business profile through image generation, Printify, Shopify, first batch, launch packet, and publish review readiness." />
    <section className="surface-card">
      <div className="section-header">
        <div>
          <h2>Wizard steps</h2>
          <p className="text-muted">Each step explains the purpose, current blocker, next action, and safe consequence if skipped.</p>
        </div>
        <form method="post" action="/api/studio/onboarding/flows/start">
          <input type="hidden" name="flowId" value="guided_launch_setup" />
          <button className="btn btn-primary" type="submit">Start guided setup</button>
        </form>
      </div>
      <GuidedStepList />
    </section>
    <SetupSafetyPanel />
  </div>;
}
