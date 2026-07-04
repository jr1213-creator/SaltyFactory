import {
  buildFeatureReadiness,
  buildOwnerSetupCards,
  parseEnv,
  primaryHuggingFaceImageModel,
  publicHuggingFaceImageModelRecommendations,
  setupGuidesForProvider,
  type OwnerSetupCard
} from "@saltyfactory/config";
import { AdvancedConfigDetails, OwnerGatedActionNotice, PageHeader, SetupProviderCard, StatusBadge, WhereToFindThisPanel } from "@saltyfactory/ui";
import { SetupApiForm } from "./_provider-form-client";

export const setupSteps = [
  { key: "business", title: "Business profile", href: "/studio/onboarding/business-profile", description: "Confirm brand, owner goals, business purpose, and document inputs." },
  { key: "image", title: "Image generation", href: "/studio/onboarding/providers/image-generation", description: "Connect the image engine before generating real artwork." },
  { key: "printify", title: "Printify", href: "/studio/onboarding/providers/printify", description: "Validate the token and choose the Printify shop." },
  { key: "shopify", title: "Shopify", href: "/studio/onboarding/providers/shopify", description: "Validate Admin access and choose a default collection." },
  { key: "batch", title: "First 15-product batch", href: "/studio/pod-batches/new", description: "Create the first owner-reviewed batch after provider setup." },
  { key: "packet", title: "Launch packet", href: "/studio/launch-packet", description: "Prepare launch materials without publishing live." },
  { key: "review", title: "Publish review", href: "/studio/publish-review", description: "Confirm all gates before draft creation or live publish." }
];

export function ownerSetupCards() {
  return buildOwnerSetupCards(buildFeatureReadiness(parseEnv(), process.env));
}

export function ConciergeHeader({ title = "Launch Setup Concierge", description = "A guided setup specialist for connecting providers, preparing the business profile, and getting to the first safe launch review without editing env files." }: { title?: string; description?: string }) {
  return <PageHeader title={title} eyebrow="Guided setup" description={description}>
    <a className="btn btn-primary" href="/studio/onboarding/guided">Launch Guided Setup</a>
    <a className="btn btn-secondary" href="/studio/onboarding/quick-start">Quick Setup</a>
  </PageHeader>;
}

export function SetupCardGrid({ cards = ownerSetupCards(), providers }: { cards?: OwnerSetupCard[]; providers?: string[] }) {
  const filtered = providers ? cards.filter((card) => providers.includes(card.providerKey)) : cards;
  return <div className="setup-card-grid setup-owner-grid">
    {filtered.map((card) => <SetupProviderCard
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
  </div>;
}

export function GuidedStepList() {
  return <ol className="setup-step-list">
    {setupSteps.map((step, index) => <li key={step.key}>
      <span>{index + 1}</span>
      <div>
        <strong>{step.title}</strong>
        <p>{step.description}</p>
      </div>
      <a className="btn btn-secondary" href={step.href}>Open step</a>
    </li>)}
  </ol>;
}

export function FieldGuides({ providerKey }: { providerKey: string }) {
  const guides = setupGuidesForProvider(providerKey);
  return <section className="setup-section" id="field-guides">
    <div className="setup-section-header">
      <div>
        <p className="eyebrow-label">Setup guide</p>
        <h2>Where do I get this?</h2>
        <p>These instructions use provider language in plain English. Secret fields are write-only and never displayed after save.</p>
      </div>
    </div>
    <div className="setup-card-grid">
      {guides.map((guide) => <article className="setup-field-guide-card" key={guide.fieldKey}>
        <h3>{guide.label}</h3>
        <p>{guide.plainEnglishDescription}</p>
        <p><strong>Why needed:</strong> {guide.whyNeeded}</p>
        <WhereToFindThisPanel steps={guide.stepsToFindIt} providerUrl={guide.providerUrl} securityNote={guide.securityNote} />
        <AdvancedConfigDetails envVars={guide.envVars} notes={[guide.whereToGetIt, ...guide.troubleshootingSteps]} />
      </article>)}
    </div>
  </section>;
}

export function PrintifySetupForms() {
  return <section className="setup-action-panel" aria-label="Printify setup actions">
    <SetupApiForm
      title="Save and validate Printify token"
      action="/api/studio/provider-connections/printify/validate-token"
      submitLabel="Save securely and validate"
      fields={[{ name: "token", label: "Printify API token", type: "password", placeholder: "Paste token securely", helper: "Write-only. SaltyFactory validates it server-side and never shows it again." }]}
    />
    <SetupApiForm
      title="Discover shops"
      description="After the token is saved, SaltyFactory can discover real Printify shops server-side."
      action="/api/studio/provider-connections/printify/discover-shops"
      submitLabel="Discover shops"
    />
    <SetupApiForm
      title="Choose shop"
      action="/api/studio/provider-connections/printify/select-shop"
      submitLabel="Select shop"
      fields={[{ name: "shopId", label: "Printify shop ID", placeholder: "Choose from discovered shops" }]}
    />
  </section>;
}

export function ShopifySetupForms() {
  return <section className="setup-action-panel" aria-label="Shopify setup actions">
    <SetupApiForm
      title="Save and validate Shopify Dev Dashboard app"
      description="New Shopify Dev Dashboard apps use Client ID and Client Secret. SaltyFactory exchanges them server-side for an Admin access token and never shows the secret after save."
      action="/api/studio/provider-connections/shopify/exchange-client-credentials"
      submitLabel="Save securely and validate"
      fields={[
        { name: "storeDomain", label: "Shopify store domain", placeholder: "saltycowhide.myshopify.com" },
        { name: "clientId", label: "Shopify Client ID", placeholder: "Paste Client ID" },
        { name: "clientSecret", label: "Shopify Client Secret", type: "password", placeholder: "Paste Client Secret securely", helper: "Write-only. Used only for server-side token exchange and never displayed after save." }
      ]}
    />
    <SetupApiForm
      title="Discover collections"
      description="After Shopify Admin is validated, SaltyFactory can list collections server-side."
      action="/api/studio/provider-connections/shopify/discover-collections"
      submitLabel="Discover collections"
    />
    <SetupApiForm
      title="Choose default collection"
      action="/api/studio/provider-connections/shopify/select-collection"
      submitLabel="Select collection"
      fields={[{ name: "collectionId", label: "Shopify collection ID", placeholder: "Choose from discovered collections" }]}
    />
    <details className="setup-legacy-details">
      <summary>Advanced / Legacy Admin token</summary>
      <p>Use this only if Shopify shows an installed custom-app Admin API access token. Most new Dev Dashboard apps use Client ID and Client Secret instead.</p>
      <SetupApiForm
        title="Validate legacy Shopify Admin token"
        action="/api/studio/provider-connections/shopify/validate-admin"
        submitLabel="Save legacy token securely"
        fields={[
          { name: "storeDomain", label: "Shopify store domain", placeholder: "saltycowhide.myshopify.com" },
          { name: "adminToken", label: "Legacy Shopify Admin token", type: "password", placeholder: "Paste token securely", helper: "Write-only. Use only if Shopify exposes an Admin API access token." }
        ]}
      />
    </details>
  </section>;
}

export function ImageGenerationSetupForms() {
  const recommendedModels = publicHuggingFaceImageModelRecommendations();
  const primaryModel = primaryHuggingFaceImageModel();
  return <section className="setup-action-panel" aria-label="Image generation setup actions">
    <div className="setup-card-grid">
      <article className="setup-field-guide-card">
        <h3>Use local demo mode</h3>
        <p>Fastest local path for development and test previews. Local demo mode does not count as provider success and cannot be used for production artwork.</p>
      </article>
      <article className="setup-field-guide-card">
        <h3>Hugging Face provider</h3>
        <p>Real provider path through Hugging Face Inference Providers. The token must include Make calls to Inference Providers.</p>
        <p><strong>Check token permission:</strong> Inference Providers.</p>
      </article>
    </div>
    <div className="setup-field-guide-card">
      <h3>Model recommendations</h3>
      <p>Do not assume <code>stabilityai/stable-diffusion-xl-base-1.0</code> works on this Hugging Face hf-inference path.</p>
      <ul>
        {recommendedModels.map((item) => <li key={item.model}>
          <strong>{item.label}</strong> <code>{item.model}</code>
          <span>{item.setupNote}</span>
        </li>)}
      </ul>
    </div>
    <SetupApiForm
      title="Validate Hugging Face image provider"
      description="Use a fine-grained Hugging Face token with Make calls to Inference Providers. Where do I get this? Open the setup guide below."
      action="/api/studio/provider-connections/image-generation/validate"
      submitLabel="Save securely and validate"
      fields={[
        { name: "provider", label: "Provider", type: "hidden", value: "hugging_face" },
        { name: "hfProvider", label: "Hugging Face provider", type: "hidden", value: "hf-inference" },
        { name: "model", label: "Image model", placeholder: primaryModel, value: primaryModel, helper: "Use a recommended hf-inference text-to-image model unless you have verified another provider-specific model." },
        { name: "token", label: "Provider token", type: "password", placeholder: "Paste token securely", helper: "Write-only. Check token permission: Inference Providers." }
      ]}
      quickActions={[{ label: "Try a recommended model", values: { model: primaryModel } }]}
    />
    <SetupApiForm
      title="Use local demo image mode"
      description="Development-only preview mode. It does not count as real provider success and cannot be used for production artwork."
      action="/api/studio/provider-connections/image-generation/validate"
      submitLabel="Use local demo mode"
      fields={[{ name: "provider", label: "Provider", type: "hidden", value: "local_dev_mock" }]}
    />
  </section>;
}

export function SetupSafetyPanel() {
  return <OwnerGatedActionNotice title="Dangerous actions remain blocked">
    <p>Live publish, money movement, external order submission, provider credential changes, and AI employee self-grants stay owner-gated or disabled for safety.</p>
  </OwnerGatedActionNotice>;
}

export function ProviderIntro({ provider }: { provider: "printify" | "shopify" | "image_generation" }) {
  const copy = {
    printify: ["Printify setup", "Connect Printify so SaltyFactory can browse catalog products, upload approved artwork, and create draft products. Live publishing remains owner-gated."],
    shopify: ["Shopify setup", "Connect Shopify Admin so SaltyFactory can create draft products with real media, variants, pricing, SEO, and collection assignment. Draft creation does not publish."],
    image_generation: ["Image generation setup", "Connect a real image provider before generating artwork. If no provider is configured, generation stays blocked with exact setup requirements."]
  }[provider];
  return <PageHeader title={copy[0]} eyebrow="Provider setup" description={copy[1]}>
    <StatusBadge status="No secrets displayed" tone="success" />
  </PageHeader>;
}
