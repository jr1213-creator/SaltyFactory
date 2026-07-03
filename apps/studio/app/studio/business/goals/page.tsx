import { createRepositories } from "@saltyfactory/db";
import { DataTable, EmptyState, PageHeader } from "@saltyfactory/ui";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

export default async function BusinessGoalsPage() {
  const goals = await createRepositories().business.goals.listByWorkspace(workspaceId);
  return <>
    <PageHeader title="Business Goals" description="Owner goals bridge business purpose to next actions. Progress snapshots are stored as assumptions." />
    <section className="surface-card">
      <h2>Create Goal</h2>
      <form className="form-grid" action="/api/studio/business/goals" method="post">
        <label>Goal type<select name="goalType"><option value="revenue">Revenue</option><option value="profit">Profit</option><option value="product_launch">Product launch</option><option value="brand">Brand</option><option value="operations">Operations</option></select></label>
        <label>Title<input name="title" defaultValue="Launch 15 margin-reviewed products" /></label>
        <label>Description<textarea name="description" defaultValue="Build a provider-backed batch with owner approvals and no automatic publish." /></label>
        <label>Target value<input name="targetValue" /></label>
        <button className="btn btn-primary" type="submit">Save Goal</button>
      </form>
    </section>
    <section className="surface-card" style={{ marginTop: 18 }}>{goals.length ? <DataTable columns={["Goal", "Type", "Priority", "Status"]} rows={goals.map((goal: any) => [goal.title, goal.goal_type ?? goal.goalType, goal.priority, goal.status])} /> : <EmptyState title="No goals yet" description="Create goals to drive business next actions." />}</section>
  </>;
}
