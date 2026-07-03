import { ConciergeHeader, GuidedStepList, SetupCardGrid, SetupSafetyPanel } from "./_components";

export default function OnboardingPage() {
  return <div className="setup-command-page onboarding-command-page">
    <ConciergeHeader />
    <section className="setup-hero">
      <div className="setup-hero-copy">
        <span className="pod-secure-kicker">Owner-friendly setup</span>
        <h2>SaltyFactory setup should feel like a specialist is walking you through it.</h2>
        <p>No customer should need to edit env files, run PowerShell, or call provider APIs manually. Guided Setup explains each connection, validates safely, and keeps dangerous actions owner-gated.</p>
      </div>
      <div className="setup-order-card">
        <h3>Choose a setup mode</h3>
        <div className="button-row">
          <a className="btn btn-primary" href="/studio/onboarding/guided">Guided Setup</a>
          <a className="btn btn-secondary" href="/studio/onboarding/quick-start">Quick Setup</a>
          <a className="btn btn-ghost" href="/studio/onboarding/help">Request setup help</a>
        </div>
      </div>
    </section>
    <SetupCardGrid />
    <section className="surface-card">
      <div className="section-header">
        <div>
          <h2>Recommended setup path</h2>
          <p className="text-muted">Each step has a visible action, plain-English blocker copy, validation, help, and advanced details when needed.</p>
        </div>
      </div>
      <GuidedStepList />
    </section>
    <SetupSafetyPanel />
  </div>;
}
