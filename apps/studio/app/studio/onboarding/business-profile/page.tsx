import { PageHeader } from "@saltyfactory/ui";

export default function BusinessProfileOnboardingPage() {
  return <div className="setup-command-page onboarding-command-page">
    <PageHeader title="Business Profile Setup" eyebrow="Guided setup" description="Start with the business facts SaltyFactory uses for documents, product decisions, goals, brand voice, and launch readiness. Sensitive values still require authority approval." />
    <section className="surface-card">
      <h2>What this step does</h2>
      <p>Business profile setup captures public brand identity, business purpose, goals, mantras, target customers, and document readiness. It does not ask AI employees to access EIN, bank data, or private credentials.</p>
      <div className="button-row">
        <a className="btn btn-primary" href="/studio/business/profile">Open Business Profile</a>
        <a className="btn btn-secondary" href="/studio/business/goals">Open Goals</a>
        <a className="btn btn-ghost" href="/studio/onboarding/help?provider=business_profile">Request setup help</a>
      </div>
    </section>
  </div>;
}
