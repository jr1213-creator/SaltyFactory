import { PageHeader, StatusBadge } from "@saltyfactory/ui";

export default function Page() {
  return <>
    <PageHeader title="Website AI Readiness Audit" description="Run a server-side safe audit for SEO, AEO, GEO, structured data, crawlability, and proposed AI-readable content signals." />
    <section className="sf-card">
      <h2>Audit API</h2>
      <p className="sf-muted">POST a public website URL to <code>/api/studio/site-audit/run</code>. The route requires Studio auth, workspace membership, SSRF-safe URL validation, timeout limits, and repository-backed persistence.</p>
      <div className="sf-button-row">
        <StatusBadge status="Protected" tone="success" />
        <StatusBadge status="SSRF guarded" tone="success" />
        <StatusBadge status="No raw HTML rendering" tone="success" />
        <StatusBadge status="llms.txt is proposed signal only" tone="warning" />
      </div>
    </section>
    <section className="sf-card" style={{ marginTop: 18 }}>
      <h2>Expected request</h2>
      <pre>{JSON.stringify({ websiteUrl: "https://example.com", brandName: "Example Brand", targetKeywords: ["coastal western"] }, null, 2)}</pre>
    </section>
  </>;
}
