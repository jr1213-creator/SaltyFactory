import { ApprovalGateList, Card, EmptyState, FilterBar, MetricCard, PageHeader, ProductCard, ProductGrid, ProgressRing, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";

export default async function Page() {
  const { assets, jobs, mockups } = await getStudioLists();
  return <>
    <PageHeader title="Generation Jobs & Assets" description="Manage generated designs, mockups, and print-ready files from concept to production.">
      <button className="sf-button sf-button-secondary">Export</button><button className="sf-button sf-button-primary">New Generation</button>
    </PageHeader>
    <FilterBar><select><option>All statuses</option></select><select><option>All products</option></select><select><option>All quality scores</option></select><select><option>All AI employees</option></select></FilterBar>
    <div className="sf-grid sf-grid-4">
      <MetricCard title="Jobs in queue" value={String(jobs.filter((j:any)=>j.status==="queued").length)} icon="□" />
      <MetricCard title="Assets approved" value={String(assets.filter((a:any)=>a.approved_for_mockup || a.approvedForMockup).length)} tone="success" icon="✓" />
      <MetricCard title="QA issues" value={String(assets.filter((a:any)=>a.qa_status==="failed" || a.qaStatus==="failed").length)} tone="danger" icon="!" />
      <MetricCard title="Mockups ready" value={String(mockups.length)} tone="warning" icon="◇" />
    </div>
    <div className="sf-split-pane" style={{ marginTop: 18 }}>
      <div className="sf-grid">
        <div className="sf-tabs"><span>Generated Art</span><span>Mockups</span><span>Print Files</span></div>
        {assets.length ? <ProductGrid>{assets.slice(0, 9).map((asset: any) => <ProductCard key={asset.id} title={asset.file_path ?? asset.id} price={asset.qa_status ?? "pending"} badge="Asset" />)}</ProductGrid> : <EmptyState title="No generated assets" description="Generation jobs will appear here after an approved brief is sent to a configured provider." />}
      </div>
      <Card><h2>Asset QA & Quality Check</h2><ProgressRing value={92} label="Quality" /><ApprovalGateList gates={[{ label: "Resolution", passed: true, detail: "Print-size validation" }, { label: "Safe zone", passed: true }, { label: "Trademark scan", passed: false, detail: "Requires human review" }, { label: "Transparency/rembg", passed: true }, { label: "Upscale status", passed: true }]} /><button className="sf-button sf-button-secondary">View Full Report</button> <button className="sf-button sf-button-primary">Approve Asset</button><p className="sf-muted">Approval remains manual and gate-backed.</p></Card>
    </div>
  </>;
}
