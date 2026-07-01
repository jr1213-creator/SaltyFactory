import { AiReadinessScoreCard, DataTable, IntegrationCard, PageHeader, RecommendationCard, SiteToolToggleCard, StatusBadge } from "@saltyfactory/ui";
import { parseEnv } from "@saltyfactory/config";
import { getIntegrationStates } from "@saltyfactory/integrations";
import { IntegrationActionsClient } from "./IntegrationActionsClient";

export default function Page() {
  const integrations = getIntegrationStates(parseEnv());
  const configuredCount = integrations.filter((item) => item.status === "connected").length;
  const readiness = Math.round((configuredCount / integrations.length) * 100);
  return <>
    <PageHeader title="Integrations & AI Readiness" description="Configure real provider connections and site readiness checks. Disabled providers do not show fake live data.">
      <a className="sf-button sf-button-secondary" href="/studio/settings/setup">Setup Wizard</a><a className="sf-button sf-button-primary" href="/studio/ai-readiness/audit">Run Site Audit</a>
    </PageHeader>
    <div className="sf-grid sf-grid-4">
      <AiReadinessScoreCard title="Overall AI Readiness Score" score={readiness} />
      <AiReadinessScoreCard title="SEO Score" score={0} />
      <AiReadinessScoreCard title="AEO Score" score={0} />
      <AiReadinessScoreCard title="GEO Score" score={0} />
    </div>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Connected Integrations</h2>
      <div className="sf-grid sf-grid-4">{integrations.map((item) => <IntegrationCard key={item.key} title={item.label} status={item.status.replace(/_/g, " ")} tone={item.status === "connected" ? "success" : item.status === "disabled" ? "warning" : "danger"} />)}</div>
    </section>
    <IntegrationActionsClient integrations={integrations} />
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <section className="sf-card"><h2>Provider Capabilities</h2><DataTable columns={["Provider", "Status", "Setup required"]} rows={integrations.map((item) => [item.label, <StatusBadge key={item.key} status={item.status.replace(/_/g, " ")} tone={item.status === "configured" ? "success" : "warning"} />, item.setupRequired.length ? item.setupRequired.join(", ") : "None"])} /></section>
      <section className="sf-card"><h2>AI Tools Configuration</h2><div className="sf-stack">{["AI Chat Assistant", "Recommendation Engine", "FAQ Agent", "Review Summarizer", "Search Enhancer", "Campaign Assistant"].map((tool) => <SiteToolToggleCard key={tool} title={tool} status="Disabled by default" tone="warning" description="Requires explicit safe configuration and approved public knowledge." />)}</div></section>
    </div>
    <RecommendationCard title="AI Readiness Insights" description="llms.txt is treated as a proposed AI-readable content signal, not a guaranteed ranking factor. Provider-backed imports require real credentials and workspace authorization." />
  </>;
}
