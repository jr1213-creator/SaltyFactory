import { PageHeader } from "@saltyfactory/ui";

export default function FirstLaunchPage() {
  return <div className="setup-command-page onboarding-command-page">
    <PageHeader title="First Launch Readiness" eyebrow="Guided setup" description="Prepare the first safe launch path: batch, generated artwork, QA, mockups, pricing, provider drafts, launch packet, and publish review." />
    <section className="surface-card">
      <h2>Launch without unsafe automation</h2>
      <p>SaltyFactory can prepare draft products and launch materials after providers are connected and workflow gates pass. Live publishing still requires explicit owner confirmation.</p>
      <div className="button-row">
        <a className="btn btn-primary" href="/studio/pod-batches/new">Create 15-product batch</a>
        <a className="btn btn-secondary" href="/studio/launch-packet">Open Launch Packet</a>
        <a className="btn btn-secondary" href="/studio/publish-review">Open Publish Review</a>
      </div>
    </section>
  </div>;
}
