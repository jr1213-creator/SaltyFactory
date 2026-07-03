import React from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";
type Props = React.PropsWithChildren<{ className?: string | undefined; title?: string | undefined; eyebrow?: string | undefined; description?: string | undefined }>;

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

export function Button({ children, className, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={cx("sf-button", `sf-button-${variant}`, className)} {...props}>{children}</button>;
}

export function LinkButton({ children, className, variant = "primary", ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <a className={cx("sf-button", `sf-button-${variant}`, className)} {...props}>{children}</a>;
}

export function Card({ children, className }: Props) {
  return <section className={cx("sf-card", className)}>{children}</section>;
}

export function DashboardCard({ children, className, title, description }: Props) {
  return <section className={cx("sf-card sf-dashboard-card", className)}>{title && <h2>{title}</h2>}{description && <p className="sf-muted">{description}</p>}{children}</section>;
}

export function PageHeader({ title, eyebrow, description, children, className }: Props) {
  return <header className={cx("sf-page-header", className)}><div>{eyebrow && <p className="sf-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="sf-page-actions">{children}</div>}</header>;
}

export function MetricCard({ title, value, delta, tone = "primary", icon }: { title: string; value: string; delta?: string; tone?: Tone; icon?: string }) {
  return <section className="sf-card sf-metric-card"><div><p>{title}</p><strong>{value}</strong>{delta && <span className={`sf-delta sf-${tone}`}>{delta}</span>}</div>{icon && <span className={`sf-icon-bubble sf-${tone}`}>{icon}</span>}</section>;
}

export function SparklineCard(props: { title: string; value: string; delta?: string }) {
  return <MetricCard {...props} icon="⌁" />;
}

export function StatusBadge({ status, tone = "neutral" }: { status: string; tone?: Tone }) {
  return <span className={`sf-badge sf-${tone}`}>{status}</span>;
}

export function ReadinessBadge({ ready, label }: { ready: boolean; label?: string }) {
  return <StatusBadge status={label ?? (ready ? "Ready" : "Blocked")} tone={ready ? "success" : "danger"} />;
}

export const ScoreBadge = ({ score, label = "Score" }: { score: number; label?: string }) => <span className={cx("sf-score", score >= 85 ? "sf-success" : score >= 70 ? "sf-warning" : "sf-danger")}><strong>{score}</strong> {label}</span>;
export const RiskBadge = ({ score }: { score: number }) => <ScoreBadge score={score} label={score > 65 ? "High risk" : score > 35 ? "Review" : "Low risk"} />;

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return <div className="sf-progress-wrap">{label && <div className="sf-progress-label"><span>{label}</span><span>{value}%</span></div>}<div className="sf-progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

export function WorkflowStepHeader({ step, title, status, description }: { step: string; title: string; status: string; description?: string }) {
  return <header className="sf-workflow-step-header"><span>{step}</span><div><h2>{title}</h2>{description && <p>{description}</p>}</div><StatusBadge status={status} tone={status === "ready" || status === "connected" ? "success" : "warning"} /></header>;
}

export function WorkflowProgress({ steps }: { steps: Array<{ label: string; status: string; complete?: boolean }> }) {
  return <ol className="sf-workflow-progress">{steps.map((step, index) => <li key={step.label} className={step.complete ? "is-complete" : ""}><span>{index + 1}</span><strong>{step.label}</strong><small>{step.status}</small></li>)}</ol>;
}

export function ProgressRing({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="sf-ring" style={{ "--value": `${safe * 3.6}deg` } as React.CSSProperties}><strong>{safe}</strong>{label && <span>{label}</span>}</div>;
}

export function MiniTrendLine() {
  return <svg className="sf-mini-line" viewBox="0 0 120 36" aria-hidden="true"><path d="M2 28 C18 18, 24 28, 38 18 S58 8, 72 16 S96 32, 118 6" /></svg>;
}

export function DonutChart({ value = 68 }: { value?: number }) {
  return <div className="sf-donut" style={{ "--value": `${value * 3.6}deg` } as React.CSSProperties}><span>{value}%</span></div>;
}

export function BarList({ items }: { items: Array<{ label: string; value: string; percent: number }> }) {
  return <div className="sf-bar-list">{items.map((item) => <div key={item.label}><div><span>{item.label}</span><strong>{item.value}</strong></div><ProgressBar value={item.percent} /></div>)}</div>;
}

export function LineChartCard({ title = "Performance", children }: Props) {
  return <ChartCard title={title}><div className="sf-line-chart"><MiniTrendLine /></div>{children}</ChartCard>;
}

export function ChartCard({ title, children, className }: Props) {
  return <section className={cx("sf-card sf-chart-card", className)}>{title && <h2>{title}</h2>}{children}</section>;
}

export function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) {
  return <div className="sf-table-wrap"><table className="sf-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export const TableToolbar = ({ children }: Props) => <div className="sf-toolbar">{children}</div>;
export const FilterBar = ({ children }: Props) => <div className="sf-filter-bar">{children}</div>;

export function EmptyState({ title = "No records yet", description = "When records are available, they will appear here.", action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return <section className="sf-empty"><strong>{title}</strong><p>{description}</p>{action}</section>;
}

export function HelpTooltip({ label, help }: { label: string; help: string }) {
  const id = `help-${label.replace(/\W+/g, "-")}`;
  return <span className="sf-help-tooltip"><button type="button" aria-describedby={id}>?</button><span role="tooltip" id={id}>{help}</span></span>;
}

export const LoadingState = ({ title = "Loading" }: { title?: string }) => <section className="sf-empty"><strong>{title}</strong><p>Preparing the latest workspace view.</p></section>;
export const ErrorState = ({ title = "Unable to load", description = "Try again in a moment." }: { title?: string; description?: string }) => <section className="sf-empty sf-danger"><strong>{title}</strong><p>{description}</p></section>;

export function ApprovalGateList({ gates }: { gates: Array<{ label: string; passed: boolean; detail?: string }> }) {
  return <ul className="sf-gate-list">{gates.map((gate) => <li key={gate.label}><span className={gate.passed ? "sf-check" : "sf-block"}>{gate.passed ? "✓" : "!"}</span><div><strong>{gate.label}</strong>{gate.detail && <p>{gate.detail}</p>}</div><StatusBadge status={gate.passed ? "Pass" : "Blocked"} tone={gate.passed ? "success" : "danger"} /></li>)}</ul>;
}

export function ValidationChecklist({ items }: { items: Array<{ label: string; status: string; passed: boolean }> }) {
  return <ApprovalGateList gates={items.map((item) => ({ label: item.label, detail: item.status, passed: item.passed }))} />;
}

export function AuditTimeline({ events }: { events: Array<{ title: string; detail: string; time: string }> }) {
  return <ol className="sf-timeline">{events.map((event) => <li key={`${event.title}-${event.time}`}><span /><div><strong>{event.title}</strong><p>{event.detail}</p><small>{event.time}</small></div></li>)}</ol>;
}

export function GuardrailPanel({ title = "Guardrails active", children }: Props) {
  return <aside className="sf-card sf-guardrail"><h2>{title}</h2>{children}</aside>;
}

export function ProviderStatusCard({ title, status = "Disabled", description, tone = "warning" }: { title: string; status?: string; description?: string; tone?: Tone }) {
  return <section className="sf-card sf-provider-card"><div><strong>{title}</strong>{description && <p>{description}</p>}</div><StatusBadge status={status} tone={tone} /></section>;
}

export const IntegrationCard = ProviderStatusCard;
export const SiteToolToggleCard = ProviderStatusCard;
export const ProviderReadinessCard = ProviderStatusCard;
export const ProviderHealthCard = ProviderStatusCard;

export function SetupRequiredPanel({ title = "Setup required", items }: { title?: string; items: string[] }) {
  return <section className="sf-card sf-blocker-card" aria-label={title}>
    <strong>{title}</strong>
    <ul>{items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>No setup blockers recorded.</li>}</ul>
  </section>;
}

export function ProviderResultPanel({ title = "Provider result", status, children }: Props & { status?: string }) {
  return <section className="sf-card sf-provider-result-panel">
    <div className="sf-card-header-row">
      <h2>{title}</h2>
      {status ? <StatusBadge status={status} tone={status === "success" || status === "ready" ? "success" : status === "failed" ? "danger" : "warning"} /> : null}
    </div>
    <div className="sf-provider-result">{children}</div>
  </section>;
}

export function AiReadinessScoreCard({ title, score }: { title: string; score: number }) {
  return <section className="sf-card sf-score-card"><div><p>{title}</p><strong>{score}<span>/100</span></strong><span className="sf-delta sf-primary">Configuration score</span></div><ProgressRing value={score} /></section>;
}

export function AiEmployeeCard({ name, role, status = "Disabled", tasks = "0", description }: { name: string; role: string; status?: string; tasks?: string; description?: string }) {
  return <article className="sf-card sf-ai-card"><div className="sf-avatar" aria-hidden="true">{name.slice(0, 1)}</div><div><h3>{name}</h3><p>{role}</p>{description && <small>{description}</small>}</div><StatusBadge status={status} tone={status === "Active" ? "success" : "warning"} /><span>{tasks} tasks</span></article>;
}

export function AiEmployeeStatusList({ employees }: { employees: Array<{ name: string; role: string; status: string }> }) {
  return <div className="sf-stack">{employees.map((employee) => <AiEmployeeCard key={employee.name} {...employee} />)}</div>;
}

export function RecommendationCard({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <section className="sf-card sf-recommendation"><strong>{title}</strong><p>{description}</p>{action}</section>;
}

export function BlockerCard({ title, blockers }: { title: string; blockers: string[] }) {
  return <section className="sf-card sf-blocker-card"><strong>{title}</strong><ul>{blockers.length ? blockers.map((blocker) => <li key={blocker}>{blocker}</li>) : <li>No blockers recorded.</li>}</ul></section>;
}

export function NextActionCard({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <section className="sf-card sf-next-action"><strong>{title}</strong><p>{description}</p>{action}</section>;
}

export function ProductPipelineCard({ title, stages }: { title: string; stages: Array<{ label: string; status: string; complete?: boolean }> }) {
  return <section className="sf-card"><h2>{title}</h2><WorkflowProgress steps={stages} /></section>;
}

export function PrintifyCatalogCard({ title, description, children }: Props) {
  return <section className="sf-card sf-catalog-card"><h2>{title}</h2>{description && <p className="sf-muted">{description}</p>}{children}</section>;
}

export function ImageGenerationJobCard({ title, status, prompt }: { title: string; status: string; prompt?: string }) {
  return <section className="sf-card sf-image-job-card"><div><h3>{title}</h3>{prompt && <p>{prompt}</p>}</div><StatusBadge status={status} tone={status === "completed" ? "success" : status === "failed" ? "danger" : "warning"} /></section>;
}

export function VariantMarginMatrix({ rows }: { rows: Array<{ variant: string; cost: string; price: string; margin: string; status: string }> }) {
  return <DataTable columns={["Variant", "Cost", "Price", "Margin", "Status"]} rows={rows.map((row) => [row.variant, row.cost, row.price, row.margin, <StatusBadge key={row.variant} status={row.status} tone={row.status === "ready" || row.status === "healthy" ? "success" : "warning"} />])} />;
}

export const PublishGateChecklist = ApprovalGateList;

export function LaunchPacketSection({ title, children }: Props) {
  return <section className="sf-card sf-launch-packet"><h2>{title}</h2>{children}</section>;
}

export function SourceLabel({ label }: { label: string }) {
  return <span className="sf-source-label">{label}</span>;
}

export function FutureIntegrationBadge({ label = "Future integration" }: { label?: string }) {
  return <StatusBadge status={label} tone="warning" />;
}

export function ProductArt({ label = "Salty Cowhide", variant = "tee" }: { label?: string; variant?: string }) {
  return <div className={`sf-product-art sf-product-${variant}`}><span>{label}</span></div>;
}

export function ProductCard({ title, price, description, badge }: { title: string; price?: string; description?: string; badge?: string }) {
  return <article className="sf-product-card"><ProductArt label={title} />{badge && <StatusBadge status={badge} tone="primary" />}<h3>{title}</h3>{description && <p>{description}</p>}{price && <strong>{price}</strong>}</article>;
}

export function ProductGrid({ children }: Props) {
  return <div className="sf-product-grid">{children}</div>;
}

export function ProductImageGallery({ title = "Coastal Cowboy Tee" }: { title?: string }) {
  return <div className="sf-gallery"><div className="sf-thumbs"><ProductArt label="Front" /><ProductArt label="Back" /><ProductArt label="Detail" /></div><ProductArt label={title} /></div>;
}

export const ProductMockupPreview = ProductArt;

export function VariantSelector({ label, options }: { label: string; options: string[] }) {
  return <fieldset className="sf-variants"><legend>{label}</legend>{options.map((option, index) => <button type="button" disabled title="Variant selection is disabled until checkout is configured." className={index === 0 ? "is-selected" : ""} key={option}>{option}</button>)}</fieldset>;
}

export function PriceMarginPanel() {
  return <DashboardCard title="Pricing & Margin"><div className="sf-kv"><span>Cost</span><strong>$12.95</strong><span>Price</span><strong>$32.00</strong><span>Margin</span><strong>Healthy</strong></div></DashboardCard>;
}

export function StructuredDataPreview({ title = "Product JSON-LD" }: { title?: string }) {
  return <pre className="sf-code">{`{\n  "@type": "Product",\n  "name": "${title}",\n  "availability": "review_required"\n}`}</pre>;
}

export const SearchCommand = () => <label className="sf-search" title="Search is disabled until a workspace search index is configured."><span>Search</span><input placeholder="Search disabled" aria-label="Search disabled" disabled /></label>;
export const NotificationBell = () => <button className="sf-icon-button" aria-label="Notifications disabled" disabled title="Notifications are not configured yet.">○<span>0</span></button>;
export const UserMenu = () => <button className="sf-user-menu" aria-label="User menu disabled" disabled title="User menu actions are not configured yet."><span className="sf-avatar">A</span><span>Studio Owner<small>Authenticated session</small></span></button>;
export const WorkspaceSwitcher = () => <button className="sf-workspace-switcher" disabled title="Single workspace is active in this local Studio session.">Salty Cowhide <span>⌄</span></button>;

export function ActionBar({ children }: Props) {
  return <div className="sf-action-bar">{children}</div>;
}

export const ActionButtonGroup = ActionBar;

export function ApprovalActionBar({ children, label = "Approval actions" }: Props & { label?: string }) {
  return <div className="sf-action-bar" aria-label={label}>{children}</div>;
}

export function SplitPane({ children }: Props) {
  return <div className="sf-split-pane">{children}</div>;
}

export function DetailDrawer({ children, title }: Props) {
  return <aside className="sf-detail-drawer">{title && <h2>{title}</h2>}{children}</aside>;
}

export const StudioAppShell = ({ children }: Props) => <div className="sf-studio-app-shell">{children}</div>;
export const StudioSidebar = ({ children }: Props) => <aside className="sf-studio-sidebar-panel">{children}</aside>;
export const StudioTopNav = ({ children }: Props) => <header className="sf-studio-top-nav">{children}</header>;
export const CommandCenterHeader = PageHeader;
export const SectionHeader = ({ title, description, children }: Props) => <header className="sf-section-header"><div><h2>{title}</h2>{description && <p className="sf-muted">{description}</p>}</div>{children}</header>;
export const EntityDetailLayout = ({ children }: Props) => <div className="sf-layout-rail">{children}</div>;
export const WorkflowCanvas = ({ children }: Props) => <section className="sf-workflow-canvas">{children}</section>;
export const StickyActionFooter = ({ children }: Props) => <div className="sf-sticky-action-footer">{children}</div>;

export const ImpactBadge = ({ impact }: { impact: string }) => <StatusBadge status={impact} tone={impact === "high" ? "success" : impact === "critical" ? "danger" : "info"} />;
export const ProviderHealthBadge = ({ status }: { status: string }) => <StatusBadge status={status} tone={status === "connected" || status === "ready" ? "success" : "warning"} />;
export const ApprovalBadge = ({ status }: { status: string }) => <StatusBadge status={status} tone={status === "approved" ? "success" : status === "rejected" ? "danger" : "warning"} />;
export const SyncStatusBadge = ({ status }: { status: string }) => <StatusBadge status={status} tone={status.includes("created") || status === "synced" ? "success" : status === "failed" ? "danger" : "warning"} />;
export const ProfitabilityBadge = ({ status }: { status: string }) => <StatusBadge status={status} tone={status === "healthy" ? "success" : status === "blocked" ? "danger" : "warning"} />;
export const PipelineStageBadge = ({ label, status }: { label: string; status: string }) => <span className="sf-pipeline-stage-badge"><strong>{label}</strong><StatusBadge status={status} tone={status === "complete" || status === "ready" ? "success" : "warning"} /></span>;

export function ProductPipelineBoard({ stages }: { stages: Array<{ label: string; status: string }> }) {
  return <section className="sf-card sf-product-pipeline-board">{stages.map((stage) => <PipelineStageBadge key={stage.label} {...stage} />)}</section>;
}

export function OwnerDecisionPanel({ title, description, children }: Props) {
  return <section className="sf-card sf-owner-decision-panel"><h2>{title}</h2>{description && <p>{description}</p>}<ApprovalActionBar>{children}</ApprovalActionBar></section>;
}

export const BlueprintCard = ({ title, description, children }: Props) => <PrintifyCatalogCard title={title} description={description}>{children}</PrintifyCatalogCard>;
export const PrintProviderCard = BlueprintCard;

export function ArtworkPlacementPanel({ title = "Artwork placement", blockers = [] as string[] }: { title?: string; blockers?: string[] }) {
  return <section className="sf-card"><h2>{title}</h2><div className="sf-artwork-placement-preview"><span>Front</span></div>{blockers.length ? <BlockerCard title="Placement blockers" blockers={blockers} /> : <p className="sf-muted">Centered placement: x 0.5, y 0.5, scale 1, angle 0.</p>}</section>;
}

export const ArtworkPreviewPanel = ({ children, title = "Artwork preview" }: Props) => <section className="sf-card"><h2>{title}</h2>{children}</section>;
export const MockupPreviewCard = ({ children, title = "Mockup preview" }: Props) => <section className="sf-card sf-mockup-preview-card"><h2>{title}</h2>{children}</section>;
export const ShopifyDraftCard = ({ title, status, children }: Props & { status?: string }) => <section className="sf-card"><h2>{title}</h2>{status && <SyncStatusBadge status={status} />}{children}</section>;

export const AiEmployeeResumePanel = ({ children, title = "Role resume" }: Props) => <section className="sf-card sf-resume-panel"><h2>{title}</h2>{children}</section>;
export const HiringRequestCard = ({ title, status, children }: Props & { status?: string }) => <section className="sf-card"><h2>{title}</h2>{status && <ApprovalBadge status={status} />}{children}</section>;
export const ImprovementSuggestionCard = HiringRequestCard;
export const CapabilityRequestPanel = HiringRequestCard;
export const ToolAccessPanel = HiringRequestCard;
export const TrainingRequestPanel = HiringRequestCard;
export const AgentFeedbackTimeline = AuditTimeline;
export const GuardrailEditor = ({ children, title = "Guardrails" }: Props) => <GuardrailPanel title={title}>{children}</GuardrailPanel>;

export function PermissionScopeMatrix({ rows }: { rows: Array<{ scope: string; level: string; approval: string }> }) {
  return <DataTable columns={["Scope", "Permission", "Owner approval"]} rows={rows.map((row) => [row.scope, row.level, row.approval])} />;
}

export const BusinessKpiCard = MetricCard;
export const UnitEconomicsCard = ({ title, status, margin }: { title: string; status: string; margin: string }) => <section className="sf-card"><h2>{title}</h2><ProfitabilityBadge status={status} /><p className="sf-muted">Contribution margin: {margin}</p></section>;
export const OpportunityCard = ({ title, description, children, action }: Props & { action?: React.ReactNode }) => <RecommendationCard title={title ?? "Opportunity"} description={description ?? ""} action={action ?? children} />;
export const DecisionMemoPanel = ({ title, children }: Props) => <section className="sf-card"><h2>{title}</h2>{children}</section>;
export const ForecastScenarioCard = DecisionMemoPanel;
export const AssumptionEditor = ({ children, title = "Assumptions" }: Props) => <section className="sf-card"><h2>{title}</h2>{children}</section>;
export const ChannelReadinessCard = ({ channel, readiness }: { channel: string; readiness: string }) => <ProviderStatusCard title={channel} status={readiness} tone={readiness === "ready" ? "success" : readiness === "blocked" ? "danger" : "warning"} />;
export const ProductProfitabilityTable = VariantMarginMatrix;
export const CustomerSegmentValueMatrix = DataTable;
export const BusinessBlockerCard = BlockerCard;
export const LegitimacyChecklist = ApprovalGateList;
export const MakeMeLookLegitPanel = NextActionCard;
export const BusinessDocumentCard = HiringRequestCard;
export const AuthorityRequestPanel = HiringRequestCard;
export const BankingConnectionCard = ProviderStatusCard;
export const TransactionClassifierTable = DataTable;
export const BusinessCardPreview = ({ svg }: { svg: string }) => <div className="sf-business-card-preview" dangerouslySetInnerHTML={{ __html: svg }} />;
