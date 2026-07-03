import { DataTable, EmptyState, PageHeader, StatusBadge } from "@saltyfactory/ui";
import { getStudioLists } from "../data";
import { BriefWorkflowClient } from "./BriefWorkflowClient";

export default async function Page() {
  const { briefs } = await getStudioLists();
  return <>
    <PageHeader title="Design Briefs" description="Create, review, approve, and send POD design briefs to the private generation queue.">
      <StatusBadge status={`${briefs.length} briefs`} tone={briefs.length ? "info" : "warning"} />
    </PageHeader>
    <BriefWorkflowClient initialBriefs={briefs as any[]} />
    <section className="surface-card" style={{ marginTop: 18 }}>
      <h2>Brief Records</h2>
      {briefs.length ? <DataTable columns={["Brief", "Status", "Generation", "Collection"]} rows={briefs.map((brief: any) => [
        brief.style_direction?.title ?? brief.id,
        <StatusBadge key="status" status={brief.status ?? "draft"} />,
        brief.approved_for_generation || brief.approvedForGeneration ? "approved" : "blocked",
        brief.collection ?? ""
      ])} /> : <EmptyState title="No briefs yet" description="Approve a design suggestion or create a manual brief to continue." />}
    </section>
  </>;
}
