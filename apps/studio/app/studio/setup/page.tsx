import { buildFeatureReadiness, parseEnv, type FeatureReadiness } from "@saltyfactory/config";
import { DataTable, PageHeader, StatusBadge } from "@saltyfactory/ui";

const statusTone = (status: string) =>
  status === "ready" ? "success" :
    status === "config_blocked" || status === "error" ? "danger" :
      status === "disabled" || status === "future" ? "warning" :
        "info";

function FeatureCard({ feature }: { feature: FeatureReadiness }) {
  return <section className="surface-card feature-readiness-card">
    <div className="card-header-row">
      <div>
        <h2>{feature.label}</h2>
        <p className="text-muted">{feature.notes.join(" ")}</p>
      </div>
      <StatusBadge status={feature.status.replace(/_/g, " ")} tone={statusTone(feature.status) as any} />
    </div>
    <div className="kv-list">
      <span>Missing env</span>
      <strong>{feature.missingEnv.length ? feature.missingEnv.join(", ") : "None"}</strong>
      <span>Can test locally</span>
      <strong>{feature.canTestWithoutProvider ? "Yes" : "No, provider config required"}</strong>
      <span>Disabled flags</span>
      <strong>{feature.disabledFlags.length ? feature.disabledFlags.join(", ") : "None"}</strong>
    </div>
    {feature.setupRequired.length ? <div className="blocker-inline"><strong>Setup required</strong><ul>{feature.setupRequired.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    <div className="action-bar">
      {feature.safeLocalRoute ? <a className="btn btn-secondary" href={feature.safeLocalRoute}>Open Feature</a> : null}
      <a className="btn btn-ghost" href={`#setup-${feature.featureKey}`}>View Setup Instructions</a>
    </div>
  </section>;
}

export default function StudioSetupPage() {
  const report = buildFeatureReadiness(parseEnv());
  const byKey = Object.fromEntries(report.features.map((feature) => [feature.featureKey, feature]));
  const providerCards = ["imageGeneration", "printify", "shopify", "podWorkflow", "aiEmployees", "businessCommandCenter", "documentOps", "printStudio", "bankingPlaidNovo", "livePublish"]
    .map((key) => byKey[key])
    .filter(Boolean) as FeatureReadiness[];
  const providerBlocks = report.features
    .filter((feature) => feature.status === "config_blocked" || feature.status === "disabled" || feature.status === "partial")
    .map((feature) => [feature.label, feature.status.replace(/_/g, " "), feature.setupRequired.join(", ") || "No setup action required."]);
  const safetyRows = report.features
    .filter((feature) => feature.dangerousActionsBlocked.length)
    .map((feature) => [feature.label, feature.dangerousActionsBlocked.join(", "), feature.disabledFlags.join(", ") || "Guardrail enforced in code"]);

  return <>
    <PageHeader
      title="Setup / Feature Readiness"
      eyebrow="Local configuration"
      description="A redacted owner setup view showing what works now, what is config-blocked, and which dangerous actions are intentionally disabled."
    />

    <section className="surface-card" id="quick-start">
      <h2>Quick Start</h2>
      <div className="layout-grid layout-grid-3">
        <div>
          <h3>What can I test right now?</h3>
          <ul>{report.safeLocalTesting.slice(0, 10).map((item) => <li key={item.featureKey}>{item.route ? <a href={item.route}>{item.label}</a> : item.label}</li>)}</ul>
        </div>
        <div>
          <h3>Recommended setup order</h3>
          <ol>{report.recommendedSetupOrder.map((item) => <li key={item}>{item}</li>)}</ol>
        </div>
        <div>
          <h3>Needs provider keys</h3>
          <ul>
            <li>Image generation: HuggingFace token/model or local dev fixture flags.</li>
            <li>Printify: enabled flag, API token, shop ID.</li>
            <li>Shopify: enabled flag, store domain, Admin token, collection ID.</li>
            <li>Plaid: client ID, secret, env, owner consent; banking stays read-only.</li>
          </ul>
        </div>
      </div>
    </section>

    <section style={{ marginTop: 18 }}>
      <div className="section-header">
        <div>
          <h2>Feature Readiness Cards</h2>
          <p className="text-muted">Missing values are shown by env var name only. Secrets are never displayed.</p>
        </div>
      </div>
      <div className="layout-grid layout-grid-3">
        {providerCards.map((feature) => <FeatureCard key={feature.featureKey} feature={feature} />)}
      </div>
    </section>

    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Safe Local Testing</h2>
      <DataTable columns={["Feature", "Route", "Expected behavior"]} rows={report.safeLocalTesting.map((item) => [item.label, item.route ?? "Internal API only", "Uses internal records or honest blocker UI; no live provider success is faked."])} />
    </section>

    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Provider Setup Blocks</h2>
      <DataTable columns={["Feature", "Status", "Exact blocker"]} rows={providerBlocks} />
    </section>

    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Safety Panel</h2>
      <p className="text-muted">Live publish, money movement, external ordering, and AI permission escalation remain disabled or owner-gated by default.</p>
      <DataTable columns={["Area", "Dangerous actions blocked", "Disabled flags / guardrail"]} rows={safetyRows} />
    </section>

    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Setup Instructions</h2>
      <div className="layout-grid layout-grid-2">
        {report.features.map((feature) => <article key={feature.featureKey} id={`setup-${feature.featureKey}`} className="subcard">
          <h3>{feature.label}</h3>
          <p><strong>Required env:</strong> {feature.requiredEnv.length ? feature.requiredEnv.join(", ") : "None"}</p>
          <p><strong>Expected blocker:</strong> {feature.setupRequired.length ? feature.setupRequired.join(", ") : "No blocker recorded."}</p>
          <p><strong>Notes:</strong> {feature.notes.join(" ")}</p>
        </article>)}
      </div>
    </section>
  </>;
}
