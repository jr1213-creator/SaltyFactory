import { publicPrintifyProviderResolution, resolvePrintifyProvider } from "@saltyfactory/commerce";
import { parseEnv } from "@saltyfactory/config";
import { createRepositories, type RepositoryBundle } from "@saltyfactory/db";
import { EmptyState, PageHeader, ProviderReadinessCard, WorkflowStepHeader } from "@saltyfactory/ui";
import { studioWorkspaceId } from "../../api/studio/design-suggestions/_shared";
import { getStudioLists, SchemaSetupState } from "../data";
import { PrintifyCatalogClient } from "./PrintifyCatalogClient";

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

export default async function Page() {
  const { drafts, setupMessage } = await getStudioLists();
  const config = parseEnv();
  const printify = publicPrintifyProviderResolution(await resolvePrintifyProvider({ workspaceId: studioWorkspaceId, repos: openRepositoriesSafely(), config }));
  const printifyReady = printify.status === "ready";
  const credentialSource = printify.credentialSource === "credential_store" ? "secure workspace credential" : printify.credentialSource === "env" ? "advanced server fallback" : "not connected";
  return <>
    <PageHeader title="Printify Catalog" description="Select real Printify shops, blueprints, providers, variants, and upload approved generated artwork before guarded product creation.">
      <a className="btn btn-secondary" href="/studio/publish-review">Back to Publish Review</a>
    </PageHeader>
    <SchemaSetupState message={setupMessage} />
    <div className="layout-grid layout-grid-3">
      <ProviderReadinessCard title="Printify API" status={printifyReady ? "connected" : "setup needed"} tone={printifyReady ? "success" : "warning"} description={printifyReady ? `Shop ${printify.shopName ?? printify.shopId ?? "selected"} is connected through ${credentialSource}.` : "Connect Printify through Launch Setup Concierge before catalog browsing or draft creation."} />
      <ProviderReadinessCard title="Artwork Upload" status={printifyReady ? "available after approved generated art" : "blocked"} tone={printifyReady ? "success" : "danger"} description="Uploads use Printify /uploads/images.json and persist the returned upload id. No fake IDs are created." />
      <ProviderReadinessCard title="Product Creation" status="owner gated" tone="warning" description="Create products only from publish review after gates, generated artwork, variants, and pricing pass." />
    </div>
    {!printifyReady ? <section className="surface-card" style={{ marginTop: 18 }}>
      <WorkflowStepHeader step="Setup" title="Connect Printify" status={printify.status.replace(/_/g, " ")} description={printify.safeMessage} />
      <div className="action-bar">
        <a className="btn btn-primary" href="/studio/onboarding/providers/printify">Connect Printify</a>
        <a className="btn btn-secondary" href="/studio/onboarding/help?provider=printify">Request setup help</a>
      </div>
      <ul>{printify.setupRequired.map((item) => <li key={item}>{item}</li>)}</ul>
    </section> : <section className="surface-card" style={{ marginTop: 18 }}>
      <WorkflowStepHeader step="Connected" title="Printify connection" status="connected" description={`Credential source: ${credentialSource}. Shop: ${printify.shopName ?? printify.shopId ?? "selected"}.`} />
    </section>}
    <section className="surface-card" style={{ marginTop: 18 }}>
      <WorkflowStepHeader step="P" title="Printify Product Inputs" status={drafts.length ? "drafts available" : "blocked"} description="Product draft, blueprint, print provider, variant IDs, pricing, and uploaded image ID are all required." />
    </section>
    {printifyReady && drafts.length ? <PrintifyCatalogClient drafts={drafts as any[]} initialShopId={printify.shopId ?? ""} initialShopName={printify.shopName ?? ""} connected /> : drafts.length ? null : <EmptyState title="No product drafts" description="Create a product draft from approved generated artwork and a composited mockup before selecting Printify catalog data." action={<a className="btn btn-primary" href="/studio/product-builder">Open Product Builder</a>} />}
  </>;
}
