import { parseEnv } from "@saltyfactory/config";
import { EmptyState, PageHeader, ProviderReadinessCard, WorkflowStepHeader } from "@saltyfactory/ui";
import { getStudioLists, SchemaSetupState } from "../data";
import { PrintifyCatalogClient } from "./PrintifyCatalogClient";

export default async function Page() {
  const { drafts, setupMessage } = await getStudioLists();
  const config = parseEnv();
  return <>
    <PageHeader title="Printify Catalog" description="Select real Printify shops, blueprints, providers, variants, and upload approved generated artwork before guarded product creation.">
      <a className="btn btn-secondary" href="/studio/publish-review">Back to Publish Review</a>
    </PageHeader>
    <SchemaSetupState message={setupMessage} />
    <div className="layout-grid layout-grid-3">
      <ProviderReadinessCard title="Printify API" status={config.providers.printify.enabled ? "configured" : "setup needed"} tone={config.providers.printify.enabled ? "success" : "warning"} description={config.providers.printify.enabled ? "Catalog and product routes can call Printify." : "Requires PRINTIFY_ENABLED=true, PRINTIFY_API_TOKEN, and PRINTIFY_SHOP_ID."} />
      <ProviderReadinessCard title="Artwork Upload" status={config.providers.printify.enabled ? "available after approved generated art" : "blocked"} tone={config.providers.printify.enabled ? "success" : "danger"} description="Uploads use Printify /uploads/images.json and persist the returned upload id. No fake IDs are created." />
      <ProviderReadinessCard title="Product Creation" status="owner gated" tone="warning" description="Create products only from publish review after gates, generated artwork, variants, and pricing pass." />
    </div>
    <section className="surface-card" style={{ marginTop: 18 }}>
      <WorkflowStepHeader step="P" title="Printify Product Inputs" status={drafts.length ? "drafts available" : "blocked"} description="Product draft, blueprint, print provider, variant IDs, pricing, and uploaded image ID are all required." />
    </section>
    {drafts.length ? <PrintifyCatalogClient drafts={drafts as any[]} /> : <EmptyState title="No product drafts" description="Create a product draft from approved generated artwork and a composited mockup before selecting Printify catalog data." action={<a className="btn btn-primary" href="/studio/product-builder">Open Product Builder</a>} />}
  </>;
}
