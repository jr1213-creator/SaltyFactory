import { createRepositories } from "@saltyfactory/db";
import { BusinessKpiCard, ChannelReadinessCard, LegitimacyChecklist, MakeMeLookLegitPanel, PageHeader, ProviderStatusCard } from "@saltyfactory/ui";
import { businessReadiness, getBusinessProfile } from "../../api/studio/business/_shared";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessCommandCenterPage() {
  const repos = createRepositories();
  const profile = await getBusinessProfile(repos);
  const readiness = businessReadiness(profile);
  const mantras = await repos.business.mantras.listByWorkspace(workspaceId);
  const activeMantra = mantras.find((row) => row.active !== false)?.mantra ?? profile?.brand_mantra ?? "Build the real thing.";
  const unitEconomics = await repos.business.unitEconomics.listByWorkspace(workspaceId);
  const opportunities = await repos.business.opportunities.listByWorkspace(workspaceId);
  const authority = await repos.business.authorityRequests.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Command Center" eyebrow={String(activeMantra)} description="Owner-reviewed business intelligence for products, margins, customers, campaigns, documents, and banking readiness. Not accounting, tax, legal, or investment advice." />
    <div className="sf-grid sf-grid-4">
      <BusinessKpiCard title="Business readiness" value={`${readiness.score}%`} delta="Real profile fields only" />
      <BusinessKpiCard title="Unit economics" value={String(unitEconomics.length)} delta="Persisted calculations" />
      <BusinessKpiCard title="Opportunities" value={String(opportunities.length)} delta="Owner decision queue" />
      <BusinessKpiCard title="Authority requests" value={String(authority.filter((row) => row.status === "pending").length)} delta="Sensitive access gates" />
    </div>
    <div className="sf-grid sf-grid-2" style={{ marginTop: 18 }}>
      <section className="sf-card">
        <h2>Business Legitimacy Checklist</h2>
        <LegitimacyChecklist gates={readiness.items.map((item) => ({ label: String(item.label), passed: item.passed, detail: item.status }))} />
      </section>
      <MakeMeLookLegitPanel title="Make Me Look Legit" description="Create an owner-review bundle: business summary, brand guidelines, capability statement, letterhead, product line sheet, and business card packet. No external submission happens." action={<form action="/api/studio/business/make-me-look-legit" method="post"><button className="sf-button sf-button-primary">Create Bundle</button></form>} />
    </div>
    <div className="sf-grid sf-grid-3" style={{ marginTop: 18 }}>
      <ProviderStatusCard title="Novo banking" status="Read-only/manual boundary" tone="warning" description="Novo direct API is not assumed. Use Plaid if configured or manual import." />
      <ChannelReadinessCard channel="Paid ads" readiness={unitEconomics.some((row) => row.status === "blocked") ? "blocked" : "unknown"} />
      <ProviderStatusCard title="Authority model" status="Active" tone="success" description="EIN/bank-sensitive fields require one-time owner authority approval." />
    </div>
  </>;
}
