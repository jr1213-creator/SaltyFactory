import { DataTable, LinkButton, PageHeader, ProviderStatusCard, StatusBadge } from "@saltyfactory/ui";
import { SchemaSetupState } from "../../data";
import { getMarketingCommandCenterData } from "../../marketing-command-center/data";

export const runtime = "nodejs";

export default async function SearchVisibilityPage() {
  const data = await getMarketingCommandCenterData();
  const scores = data.readinessScores.filter((score: any) => String(score.score_type ?? score.scoreType ?? "") === "seo_geo");
  const reports = data.exportPackages.filter((pack: any) => String(pack.package_type ?? pack.packageType ?? "") === "seo_report");
  return <>
    <PageHeader eyebrow="Search/AEO/GEO Center" title="Search / AEO / GEO Center" description="Native readiness scoring for crawlability, schema, entity consistency, answer blocks, proof visibility, and owned-surface consistency. No ranking or AI-visibility guarantees.">
      <LinkButton href="/studio/marketing-command-center" variant="secondary">Marketing Command Center</LinkButton>
    </PageHeader>
    <SchemaSetupState message={data.setupMessage} />
    <section className="sf-card">
      <h2>Create Search Visibility Audit</h2>
      <form className="sf-grid sf-grid-2" action="/api/studio/marketing/search-visibility/audit" method="post">
        <input type="hidden" name="next" value="/studio/marketing/search-visibility" />
        {[
          ["robots", "robots.txt / crawl access reviewed"],
          ["llms", "llms.txt drafted/reviewed"],
          ["schema", "JSON-LD/schema basics complete"],
          ["entity", "Brand/entity language consistent"],
          ["crawlable", "Important content server-rendered/crawlable"],
          ["metadata", "Metadata and canonical URLs complete"],
          ["proof", "Proof/source labels visible"]
        ].map(([key, label]) => <label key={key}><input type="checkbox" name={key} /> {label}</label>)}
        <button className="sf-button" type="submit">Create Audit</button>
      </form>
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Saved SEO/AEO/GEO Scores</h2>
      <DataTable columns={["Score", "Status", "Blockers"]} rows={scores.length ? scores.map((score: any) => [
        `${score.score_value ?? score.scoreValue ?? 0}/${score.max_score ?? score.maxScore ?? 100}`,
        <StatusBadge key={score.id} status={String(score.status ?? "setup_needed").replace(/_/g, " ")} tone={String(score.status) === "ready" ? "success" : "warning"} />,
        Array.isArray(score.blockers) ? score.blockers.join(", ") : JSON.stringify(score.blockers ?? [])
      ]) : [["No score yet", "Create audit above.", "No fake SEO score"]]} />
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Reports</h2>
      <DataTable columns={["Report", "Status", "Guarantee"]} rows={reports.length ? reports.map((report: any) => [
        report.title,
        String(report.status ?? "ready_for_review").replace(/_/g, " "),
        "No ranking or AI search guarantee"
      ]) : [["No reports", "Create audit above.", "No guarantees"]]} />
    </section>
    <ProviderStatusCard title="External crawling" status="not implemented" tone="warning" description="This pass uses owner-entered readiness inputs and owned records. It does not crawl the live web." />
  </>;
}
