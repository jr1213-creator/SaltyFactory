import { publicImageGenerationProviderResolution, resolveImageGenerationProvider } from "@saltyfactory/ai-free";
import { applyImageGenerationRuntimeReadiness, applyStorageRuntimeReadiness, buildFeatureReadiness, buildOwnerSetupCards, parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { checkStorageReadiness } from "@saltyfactory/storage";
import { AdvancedConfigDetails, PageHeader, SetupProviderCard } from "@saltyfactory/ui";
import { studioWorkspaceId } from "../../api/studio/design-suggestions/_shared";
import { StorageReadinessPanel } from "../StorageReadinessPanel";

function canOpenRepositories() {
  return process.env.NODE_ENV === "test" || process.env.REPOSITORY_ADAPTER === "memory" || Boolean(process.env.DATABASE_URL) || process.env.APP_ENV === "production";
}

function openRepositoriesSafely(): RepositoryBundle | undefined {
  if (!canOpenRepositories()) return undefined;
  try {
    return createRepositories();
  } catch {
    return undefined;
  }
}

export default async function StudioSetupPage() {
  const config = parseEnv();
  const provider = await resolveImageGenerationProvider({ workspaceId: studioWorkspaceId, repos: openRepositoriesSafely(), config });
  const storageDiagnostic = await checkStorageReadiness(config);
  const report = applyImageGenerationRuntimeReadiness(
    applyStorageRuntimeReadiness(buildFeatureReadiness(config, process.env, studioWorkspaceId), storageDiagnostic),
    publicImageGenerationProviderResolution(provider)
  );
  const cards = buildOwnerSetupCards(report);
  const internalReady = report.features.filter((feature) => feature.canTestWithoutProvider && !["printify", "shopify", "imageGeneration"].includes(feature.featureKey));
  const future = cards.filter((card) => card.status === "future");

  return <div className="setup-command-page">
    <PageHeader
      className="pod-page-header"
      title="Setup / Feature Readiness"
      eyebrow="Launch Setup Concierge"
      description="Owner-friendly setup for connecting providers and understanding blockers without editing env files. Developer/server configuration remains available in Advanced details only."
    >
      <a className="btn btn-primary" href="/studio/onboarding/guided">Launch Guided Setup</a>
      <a className="btn btn-secondary" href="/studio/onboarding/quick-start">Quick Setup</a>
    </PageHeader>

    <section className="setup-hero" id="quick-start">
      <div className="setup-hero-copy">
        <span className="pod-secure-kicker">No Dead Config States</span>
        <h2>Every blocker has a next action.</h2>
        <p>Instead of asking Jennie to edit configuration files, SaltyFactory explains what is missing, why it matters, where to get it, how to validate it, and when administrator setup is required.</p>
      </div>
      <div className="setup-summary-grid" aria-label="Setup readiness summary">
        <article><strong>{report.summary.ready}</strong><span>Ready</span></article>
        <article><strong>{cards.filter((card) => card.status === "needs_setup" || card.status === "admin_setup_required").length}</strong><span>Need setup</span></article>
        <article><strong>{cards.filter((card) => card.status === "owner_gated").length}</strong><span>Owner gated</span></article>
        <article><strong>{future.length}</strong><span>Future</span></article>
      </div>
      <div className="setup-order-card">
        <h3>Recommended setup order</h3>
        <ol>{report.recommendedSetupOrder.map((item) => <li key={item}>{item}</li>)}</ol>
      </div>
    </section>

    <StorageReadinessPanel diagnostic={storageDiagnostic} />

    <section className="setup-section">
      <div className="setup-section-header">
        <div>
          <p className="eyebrow-label">Owner Setup</p>
          <h2>Guided provider connection cards</h2>
          <p>These cards use business-facing language by default. Secret values are write-only and never shown after save.</p>
        </div>
      </div>
      <div className="setup-card-grid setup-owner-grid">
        {cards.map((card) => <SetupProviderCard
          key={card.providerKey}
          label={card.label}
          status={card.status}
          explanation={card.explanation}
          whyItMatters={card.whyItMatters}
          primaryAction={card.primaryAction}
          setupGuideAction={card.setupGuideAction}
          validationAction={card.validationAction}
          requestHelpAction={card.requestHelpAction}
          setupRequired={card.setupRequired}
          dangerousActionsBlocked={card.dangerousActionsBlocked}
          advancedEnvVars={card.advancedDetails.envVars}
          advancedNotes={card.advancedDetails.deploymentNotes}
          maskedDisplayValue={card.maskedDisplayValue}
        />)}
      </div>
    </section>

    <section className="setup-section">
      <div className="setup-section-header">
        <div>
          <p className="eyebrow-label">Safe local testing</p>
          <h2>Internal features ready without provider keys</h2>
          <p>These areas can be inspected with internal records, local fixtures, or explicit blocker UI. They do not claim provider success.</p>
        </div>
      </div>
      <div className="setup-local-grid">
        {internalReady.map((feature) => <a className="setup-local-card" href={feature.safeLocalRoute ?? "/studio"} key={feature.featureKey}>
          <strong>{feature.label}</strong>
          <span>{feature.safeLocalRoute ?? "/studio"}</span>
          <small>{feature.notes.join(" ") || "Internal workflow can be tested without live provider keys."}</small>
        </a>)}
      </div>
    </section>

    <section className="setup-section">
      <div className="setup-section-header">
        <div>
          <p className="eyebrow-label">Safety Panel</p>
          <h2>Dangerous actions are blocked by design</h2>
          <p>Live publish, money movement, external ordering, and AI employee self-permission changes stay disabled or owner-gated. If enabled later, gates still apply.</p>
        </div>
      </div>
      <div className="setup-safety-grid">
        {cards.filter((card) => card.dangerousActionsBlocked.length).map((card) => <article className="setup-safety-card" key={card.providerKey}>
          <div className="setup-feature-header">
            <h3>{card.label}</h3>
            <span className="status-badge tone-warning">{card.status.replace(/_/g, " ")}</span>
          </div>
          <strong>Blocked for safety</strong>
          <ul>{card.dangerousActionsBlocked.map((item) => <li key={item}>{item.replace(/_/g, " ")}</li>)}</ul>
          <a className="btn btn-secondary" href={card.requestHelpAction.href}>Request setup help</a>
        </article>)}
      </div>
    </section>

    <section className="setup-section">
      <div className="setup-section-header">
        <div>
          <p className="eyebrow-label">Advanced Server Configuration</p>
          <h2>Developer/deployment details</h2>
          <p>Env var names are for local development, CI, or server deployment. This is not the primary customer setup path.</p>
        </div>
      </div>
      <div className="setup-card-grid">
        {cards.map((card) => <article className="setup-feature-card is-compact" key={`advanced-${card.providerKey}`}>
          <h3>{card.label}</h3>
          <p>{card.advancedDetails.summary}</p>
          <AdvancedConfigDetails envVars={card.advancedDetails.envVars} notes={card.advancedDetails.deploymentNotes} />
        </article>)}
      </div>
    </section>
  </div>;
}
