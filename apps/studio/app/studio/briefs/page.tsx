import { AiEmployeeCard, ApprovalGateList, Button, Card, PageHeader, ProductCard, ProductGrid, ProgressRing, RecommendationCard, StructuredDataPreview } from "@saltyfactory/ui";
import { getStudioLists } from "../data";

export default async function Page() {
  const { briefs } = await getStudioLists();
  return <>
    <PageHeader title="Design Brief Builder" description="Turn approved trend insights into production-ready POD briefs your AI team can execute.">
      <button className="sf-button sf-button-secondary">Save Draft</button>
      <button className="sf-button sf-button-primary">Send to Generation</button>
      <button className="sf-button sf-button-ghost">Request Review</button>
    </PageHeader>
    <div className="sf-workspace-grid">
      <Card>
        <h2>Brief Essentials</h2>
        <form className="sf-form-grid">
          <label>Brief name<input defaultValue={briefs[0]?.collection as string || "Coastal capsule draft"} /></label>
          <label>Workspace<select><option>Salty Cowhide</option></select></label>
          <label>Trend cluster<select><option>Choose approved cluster</option></select></label>
          <label>Target audience<select><option>Coastal lifestyle enthusiasts</option></select></label>
          <label>Brand voice<select><option>Premium, clear, laid-back</option></select></label>
          <label>Art direction<textarea defaultValue="Retro coastal western artwork. Avoid protected brands, celebrities, teams, and copied competitor phrasing." /></label>
          <label>Required text phrases<input defaultValue="Original phrase only after risk review" /></label>
          <label>Banned words<input defaultValue="celebrity names, team names, brand lookalikes" /></label>
          <label>Print area<select><option>Front center</option></select></label>
        </form>
      </Card>
      <div className="sf-grid">
        <Card><h2>AI Brief Pack</h2><StructuredDataPreview title="Generation prompt preview" /><ApprovalGateList gates={[{ label: "No banned words detected", passed: true }, { label: "Trademark risk scan", passed: false, detail: "Human review required before generation" }, { label: "Print readability", passed: true }, { label: "SEO/AEO/GEO hints", passed: true }]} /><Button variant="secondary">Copy Prompt</Button></Card>
        <Card><h2>AI Employee Assignments</h2><div className="sf-grid sf-grid-2"><AiEmployeeCard name="Design Creator" role="Image generation" status="Disabled" /><AiEmployeeCard name="Copywriter" role="Listing copy" status="Disabled" /></div></Card>
      </div>
      <div className="sf-grid">
        <Card><h2>Live Preview</h2><ProductGrid><ProductCard title="Concept Tee" price="Review required" badge="Preview" /><ProductCard title="Concept Hoodie" price="Review required" badge="Preview" /></ProductGrid><p className="sf-muted">Concept previews are not approved product assets.</p></Card>
        <Card><h2>Brief Health</h2><ProgressRing value={82} label="Review" /><RecommendationCard title="Quality note" description="Provider-gated generation remains disabled until credentials and approval are configured." /></Card>
      </div>
    </div>
  </>;
}
