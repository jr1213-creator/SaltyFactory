import { buildFeatureReadiness, parseEnv, type FeatureReadiness } from "@saltyfactory/config";
import { PageHeader, StatusBadge } from "@saltyfactory/ui";
import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const providerSetupKeys = new Set(["auth", "database", "storage", "imageGeneration", "worker", "printify", "shopify", "bankingPlaidNovo", "livePublish"]);
const internalKeys = new Set(["podWorkflow", "aiEmployees", "businessCommandCenter", "businessIdentity", "documentOps", "authorityRequests"]);

const statusTone = (status: string): Tone =>
  status === "ready" ? "success" :
    status === "config_blocked" || status === "error" ? "danger" :
      status === "disabled" || status === "future" ? "warning" :
        "info";

function readableStatus(status: string) {
  return status.replace(/_/g, " ");
}

function EnvNameList({ values, empty = "None" }: { values: string[]; empty?: string }) {
  return <div className="setup-env-list">
    {values.length ? values.map((value) => <code key={value}>{value}</code>) : <span>{empty}</span>}
  </div>;
}

function FeatureCard({ feature, compact = false }: { feature: FeatureReadiness; compact?: boolean }) {
  return <article className={`setup-feature-card${compact ? " is-compact" : ""}`}>
    <div className="setup-feature-header">
      <div>
        <h3>{feature.label}</h3>
        <p>{feature.notes.join(" ")}</p>
      </div>
      <StatusBadge status={readableStatus(feature.status)} tone={statusTone(feature.status)} />
    </div>
    <dl className="setup-feature-facts">
      <div>
        <dt>Missing configuration</dt>
        <dd><EnvNameList values={feature.missingEnv} /></dd>
      </div>
      <div>
        <dt>Local testing</dt>
        <dd>{feature.canTestWithoutProvider ? "Can be tested without live provider keys" : "Requires provider configuration"}</dd>
      </div>
      {!compact ? <div>
        <dt>Disabled flags</dt>
        <dd><EnvNameList values={feature.disabledFlags} /></dd>
      </div> : null}
    </dl>
    {feature.setupRequired.length ? <div className="setup-required-list">
      <strong>Setup required</strong>
      <ul>{feature.setupRequired.map((item) => <li key={item}>{item}</li>)}</ul>
    </div> : null}
    <div className="action-bar">
      {feature.safeLocalRoute ? <a className="btn btn-secondary" href={feature.safeLocalRoute}>Open Feature</a> : null}
      <a className="btn btn-ghost" href={`#setup-${feature.featureKey}`}>Setup Instructions</a>
    </div>
  </article>;
}

function SetupSection({ title, description, children, eyebrow = "Feature readiness" }: { title: string; description: string; children: ReactNode; eyebrow?: string }) {
  return <section className="setup-section">
    <div className="setup-section-header">
      <div>
        <p className="eyebrow-label">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
    {children}
  </section>;
}

export default function StudioSetupPage() {
  const report = buildFeatureReadiness(parseEnv());
  const providerSetup = report.features.filter((feature) => providerSetupKeys.has(feature.featureKey));
  const internalReady = report.features.filter((feature) => internalKeys.has(feature.featureKey));
  const partialLocal = report.features.filter((feature) => ["partial", "disabled", "owner_gated"].includes(feature.status) && !providerSetupKeys.has(feature.featureKey));
  const future = report.features.filter((feature) => feature.status === "future");
  const safetyRows = report.features.filter((feature) => feature.dangerousActionsBlocked.length);

  return <div className="setup-command-page">
    <PageHeader
      className="pod-page-header"
      title="Setup / Feature Readiness"
      eyebrow="Local configuration"
      description="A redacted owner setup view showing what works now, what is config-blocked, what can be tested locally, and which dangerous actions remain intentionally disabled."
    />

    <section className="setup-hero" id="quick-start">
      <div className="setup-hero-copy">
        <span className="pod-secure-kicker">Quick Start</span>
        <h2>Configure safely, then test one workflow at a time.</h2>
        <p>Internal command centers can be reviewed without live provider keys. Provider-backed image generation, Printify, Shopify, Plaid, and live publish remain blocked until their protected configuration and owner gates are ready.</p>
      </div>
      <div className="setup-summary-grid" aria-label="Setup readiness summary">
        <article><strong>{report.summary.ready}</strong><span>Ready</span></article>
        <article><strong>{report.summary.configBlocked}</strong><span>Config blocked</span></article>
        <article><strong>{report.summary.partial}</strong><span>Partial/local</span></article>
        <article><strong>{report.summary.future}</strong><span>Future</span></article>
      </div>
      <div className="setup-order-card">
        <h3>Recommended setup order</h3>
        <ol>{report.recommendedSetupOrder.map((item) => <li key={item}>{item}</li>)}</ol>
      </div>
    </section>

    <SetupSection title="Provider Setup Required" eyebrow="Feature Readiness Cards" description="These areas unlock real provider actions only after protected server-side configuration is present. Values are never displayed here.">
      <div className="setup-card-grid">
        {providerSetup.map((feature) => <FeatureCard key={feature.featureKey} feature={feature} />)}
      </div>
    </SetupSection>

    <SetupSection title="Internal Features Ready" description="These workflows can be exercised with internal records or local fixtures without claiming provider success.">
      <div className="setup-card-grid">
        {internalReady.map((feature) => <FeatureCard key={feature.featureKey} feature={feature} compact />)}
      </div>
    </SetupSection>

    <SetupSection title="Partial / Local-Only Features" description="These are honest foundations or local-only workflows. They should not be read as live external integration success.">
      <div className="setup-card-grid">
        {partialLocal.map((feature) => <FeatureCard key={feature.featureKey} feature={feature} compact />)}
      </div>
    </SetupSection>

    <SetupSection title="Safety Panel" description="Dangerous actions remain disabled or owner-gated by default. This section shows guardrails, not secret values.">
      <div className="setup-safety-grid">
        {safetyRows.map((feature) => <article className="setup-safety-card" key={feature.featureKey}>
          <div className="setup-feature-header">
            <h3>{feature.label}</h3>
            <StatusBadge status={readableStatus(feature.status)} tone={statusTone(feature.status)} />
          </div>
          <strong>Dangerous actions blocked</strong>
          <ul>{feature.dangerousActionsBlocked.map((action) => <li key={action}>{readableStatus(action)}</li>)}</ul>
          <strong>Disabled flags / guardrail</strong>
          <EnvNameList values={feature.disabledFlags} empty="Guardrail enforced in code" />
        </article>)}
      </div>
    </SetupSection>

    <SetupSection title="Safe Local Testing" description="These are the areas Jennie can open safely to inspect internal workflows or explicit blocker UI without live provider credentials.">
      <div className="setup-local-grid">
        {report.safeLocalTesting.map((item) => <a className="setup-local-card" href={item.route ?? "/studio/setup"} key={item.featureKey}>
          <strong>{item.label}</strong>
          <span>{item.route ?? "Internal API only"}</span>
          <small>Uses internal records or honest blockers; no live provider success is faked.</small>
        </a>)}
      </div>
    </SetupSection>

    <SetupSection title="Future Integrations" description="These features are intentionally not live. They should stay disabled until a verified provider integration and owner gate exist.">
      <div className="setup-card-grid">
        {future.map((feature) => <FeatureCard key={feature.featureKey} feature={feature} compact />)}
      </div>
    </SetupSection>

    <SetupSection title="Setup Instructions" description="Exact env var names are listed here only. Values, tokens, and secret-like strings are never shown in the Studio UI.">
      <div className="setup-instruction-grid">
        {report.features.map((feature) => <article key={feature.featureKey} id={`setup-${feature.featureKey}`} className="setup-instruction-card">
          <h3>{feature.label}</h3>
          <p><strong>Required env names</strong></p>
          <EnvNameList values={feature.requiredEnv} />
          <p><strong>Expected blocker</strong></p>
          <ul>{feature.setupRequired.length ? feature.setupRequired.map((item) => <li key={item}>{item}</li>) : <li>No blocker recorded.</li>}</ul>
        </article>)}
      </div>
    </SetupSection>
  </div>;
}
