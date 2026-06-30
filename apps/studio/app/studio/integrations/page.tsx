import { AiReadinessScoreCard, DataTable, IntegrationCard, PageHeader, RecommendationCard, SiteToolToggleCard } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";

export default function Page() {
  const cfg = parseEnv();
  const providers = [
    ["Shopify", cfg.providers.shopifyAdmin.enabled || cfg.providers.shopifyStorefront.enabled],
    ["Printify", cfg.providers.printify.enabled],
    ["Supabase", Boolean(cfg.SUPABASE_URL)],
    ["Google Analytics 4", false],
    ["Google Search Console", false],
    ["Meta Ads", false],
    ["Pinterest", false],
    ["Email / SMS", false],
    ["Hugging Face", cfg.providers.aiText.enabled || cfg.providers.aiImage.enabled],
    ["Storage", Boolean(cfg.SUPABASE_PUBLIC_ASSETS_BUCKET)]
  ] as const;
  return <>
    <PageHeader title="Integrations & AI Readiness" description="Configure storefront readiness, search readiness, and safe automation boundaries.">
      <button className="sf-button sf-button-secondary">View docs</button><button className="sf-button sf-button-primary">Run Readiness Audit</button>
    </PageHeader>
    <div className="sf-grid sf-grid-4">
      <AiReadinessScoreCard title="Overall AI Readiness Score" score={64} />
      <AiReadinessScoreCard title="SEO Score" score={72} />
      <AiReadinessScoreCard title="AEO Score" score={58} />
      <AiReadinessScoreCard title="GEO Score" score={54} />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}><h2>Connected Integrations</h2><div className="sf-grid sf-grid-4">{providers.map(([name, enabled]) => <IntegrationCard key={name} title={name} status={enabled ? "Configured" : "Needs credentials"} tone={enabled ? "success" : "warning"} />)}</div></section>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <section className="sf-card"><h2>Site Schema & Content Readiness</h2><DataTable columns={["Area", "Health", "Action"]} rows={[["Structured Data", "Valid when products exist", "Review"], ["FAQ Schema", "Ready", "View"], ["Product Schema", "Requires approved products", "Review"], ["Crawler policy", "Ready", "View"]]} /></section>
      <section className="sf-card"><h2>AI Tools Configuration</h2><div className="sf-stack">{["AI Chat Assistant","Recommendation Engine","FAQ Agent","Review Summarizer","Search Enhancer","Campaign Assistant"].map((tool) => <SiteToolToggleCard key={tool} title={tool} status="Disabled by default" tone="warning" description="Requires explicit safe configuration." />)}</div></section>
    </div>
    <RecommendationCard title="AI Readiness Insights" description="The site is prepared for schema and search-safe content, but AI tools remain disabled until providers and review policies are configured." />
  </>;
}
