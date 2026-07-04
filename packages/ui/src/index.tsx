import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { Bell, Building2, CircleUserRound } from "lucide-react";
import { twMerge } from "tailwind-merge";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";
type Props = React.PropsWithChildren<{ className?: string | undefined; title?: string | undefined; eyebrow?: string | undefined; description?: string | undefined }>;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ownerFacingStatus(value: string) {
  return value.replace(/_/g, " ");
}

const toneText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  primary: "text-primary"
};

const badgeTone: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-destructive/20 bg-destructive-soft text-destructive",
  info: "border-info/20 bg-info-soft text-info",
  primary: "border-primary/20 bg-primary-soft text-primary"
};

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-primary-foreground hover:bg-primary-dark",
        secondary: "border-border bg-card text-foreground hover:bg-muted",
        ghost: "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "border-destructive bg-destructive text-white hover:bg-destructive/90"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

export function Button({
  children,
  className,
  variant,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props}>{children}</Comp>;
}

export function LinkButton({ children, className, variant = "primary", ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & VariantProps<typeof buttonVariants>) {
  return <a className={cn(buttonVariants({ variant }), className)} {...props}>{children}</a>;
}

export function Card({ children, className }: Props) {
  return <section className={cn("rounded-lg border border-border bg-card p-5 shadow-card", className)}>{children}</section>;
}

export function DashboardCard({ children, className, title, description }: Props) {
  return <Card className={cn("min-h-28", className)}>{title && <h2 className="text-lg font-bold">{title}</h2>}{description && <p className="text-muted-foreground">{description}</p>}{children}</Card>;
}

export function PageHeader({ title, eyebrow, description, children, className }: Props) {
  return <header className={cn("mb-6 flex items-start justify-between gap-5", className)}><div>{eyebrow && <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{eyebrow}</p>}<h1 className="text-3xl font-black leading-tight tracking-normal text-foreground md:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>}</div>{children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}</header>;
}

export function MetricCard({ title, value, delta, tone = "primary", icon }: { title: string; value: string; delta?: string; tone?: Tone; icon?: string }) {
  return <Card className="flex min-h-28 items-center justify-between gap-4"><div><p className="mb-1 font-bold text-muted-foreground">{title}</p><strong className="block text-3xl leading-none">{value}</strong>{delta && <span className={cn("mt-2 block text-xs font-bold", toneText[tone])}>{delta}</span>}</div>{icon && <span className={cn("grid size-13 place-items-center rounded-lg bg-primary-soft font-black", toneText[tone])}>{icon}</span>}</Card>;
}

export function SparklineCard(props: { title: string; value: string; delta?: string }) {
  return <MetricCard {...props} icon="~" />;
}

export function StatusBadge({ status, tone = "neutral" }: { status: string; tone?: Tone }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold", badgeTone[tone])}>{ownerFacingStatus(status)}</span>;
}

export function ReadinessBadge({ ready, label }: { ready: boolean; label?: string }) {
  return <StatusBadge status={label ?? (ready ? "Ready" : "Blocked")} tone={ready ? "success" : "danger"} />;
}

export const ScoreBadge = ({ score, label = "Score" }: { score: number; label?: string }) => <span className={cn(score >= 85 ? toneText.success : score >= 70 ? toneText.warning : toneText.danger)}><strong>{score}</strong> {label}</span>;
export const RiskBadge = ({ score }: { score: number }) => <ScoreBadge score={score} label={score > 65 ? "High risk" : score > 35 ? "Review" : "Low risk"} />;

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div>{label && <div className="mb-1 flex justify-between gap-3 text-xs text-muted-foreground"><span>{label}</span><span>{safe}%</span></div>}<div className="h-2.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-gradient-to-r from-primary to-turquoise" style={{ width: `${safe}%` }} /></div></div>;
}

export function WorkflowStepHeader({ step, title, status, description }: { step: string; title: string; status: string; description?: string }) {
  return <header className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-border bg-gradient-to-br from-card to-primary-soft p-4"><span className="grid size-10 place-items-center rounded-md bg-primary font-black text-primary-foreground">{step}</span><div><h2 className="mb-1 text-lg font-bold">{title}</h2>{description && <p className="m-0 text-muted-foreground">{description}</p>}</div><StatusBadge status={status} tone={status === "ready" || status === "connected" ? "success" : "warning"} /></header>;
}

export function WorkflowProgress({ steps }: { steps: Array<{ label: string; status: string; complete?: boolean }> }) {
  return <ol className="grid list-none gap-2.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">{steps.map((step, index) => <li key={step.label} className={cn("grid gap-1 rounded-md border border-border bg-card p-3", step.complete && "border-success/30 bg-success-soft")}><span className="grid size-7 place-items-center rounded-full bg-primary-soft font-black text-primary">{index + 1}</span><strong className="text-sm">{step.label}</strong><small className="text-muted-foreground">{step.status}</small></li>)}</ol>;
}

export function ProgressRing({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className="progress-ring" style={{ "--value": `${safe * 3.6}deg` } as React.CSSProperties}><strong>{safe}</strong>{label && <span>{label}</span>}</div>;
}

export function MiniTrendLine() {
  return <svg className="mini-line" viewBox="0 0 120 36" aria-hidden="true"><path d="M2 28 C18 18, 24 28, 38 18 S58 8, 72 16 S96 32, 118 6" /></svg>;
}

export function DonutChart({ value = 68 }: { value?: number }) {
  return <div className="donut-chart" style={{ "--value": `${value * 3.6}deg` } as React.CSSProperties}><span>{value}%</span></div>;
}

export function BarList({ items }: { items: Array<{ label: string; value: string; percent: number }> }) {
  return <div className="grid gap-3">{items.map((item) => <div key={item.label}><div className="mb-1 flex justify-between"><span>{item.label}</span><strong>{item.value}</strong></div><ProgressBar value={item.percent} /></div>)}</div>;
}

export function LineChartCard({ title = "Performance", children }: Props) {
  return <ChartCard title={title}><div className="line-chart"><MiniTrendLine /></div>{children}</ChartCard>;
}

export function ChartCard({ title, children, className }: Props) {
  return <Card className={className}>{title && <h2 className="text-lg font-bold">{title}</h2>}{children}</Card>;
}

export function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) {
  return <div className="overflow-auto rounded-lg border border-border bg-card"><table className="w-full min-w-[760px] border-collapse"><thead><tr>{columns.map((column) => <th className="border-b border-border bg-muted px-4 py-3 text-left text-xs text-muted-foreground" key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr className="hover:bg-muted/50" key={index}>{row.map((cell, cellIndex) => <td className="border-b border-border px-4 py-3 align-middle" key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export const TableToolbar = ({ children }: Props) => <div className="mb-5 flex flex-wrap gap-2.5">{children}</div>;
export const FilterBar = ({ children }: Props) => <div className="mb-5 flex flex-wrap gap-2.5">{children}</div>;

export function EmptyState({ title = "No records yet", description = "When records are available, they will appear here.", action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return <section className="rounded-lg border border-dashed border-border-strong bg-card p-8 text-center text-muted-foreground"><strong className="block text-lg text-foreground">{title}</strong><p>{description}</p>{action}</section>;
}

export function HelpTooltip({ label, help }: { label: string; help: string }) {
  const id = `help-${label.replace(/\W+/g, "-")}`;
  return <span className="help-tooltip"><button type="button" aria-describedby={id}>?</button><span role="tooltip" id={id}>{help}</span></span>;
}

export const LoadingState = ({ title = "Loading" }: { title?: string }) => <EmptyState title={title} description="Preparing the latest workspace view." />;
export const ErrorState = ({ title = "Unable to load", description = "Try again in a moment." }: { title?: string; description?: string }) => <section className="rounded-lg border border-destructive/20 bg-destructive-soft p-8 text-center text-destructive"><strong className="block text-lg">{title}</strong><p>{description}</p></section>;

export function ApprovalGateList({ gates }: { gates: Array<{ label: string; passed: boolean; detail?: string }> }) {
  return <ul className="m-0 grid list-none gap-2.5 p-0">{gates.map((gate) => <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border p-3" key={gate.label}><span className={cn("grid size-7 place-items-center rounded-full font-black", gate.passed ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive")}>{gate.passed ? "OK" : "!"}</span><div><strong>{gate.label}</strong>{gate.detail && <p className="m-0 text-xs text-muted-foreground">{gate.detail}</p>}</div><StatusBadge status={gate.passed ? "Pass" : "Blocked"} tone={gate.passed ? "success" : "danger"} /></li>)}</ul>;
}

export function ValidationChecklist({ items }: { items: Array<{ label: string; status: string; passed: boolean }> }) {
  return <ApprovalGateList gates={items.map((item) => ({ label: item.label, detail: item.status, passed: item.passed }))} />;
}

export function AuditTimeline({ events }: { events: Array<{ title: string; detail: string; time: string }> }) {
  return <ol className="m-0 grid list-none gap-2.5 p-0">{events.map((event) => <li className="grid grid-cols-[20px_1fr] gap-3" key={`${event.title}-${event.time}`}><span className="mt-1 size-3 rounded-full bg-primary" /><div><strong>{event.title}</strong><p className="m-0 text-muted-foreground">{event.detail}</p><small className="text-muted-foreground">{event.time}</small></div></li>)}</ol>;
}

export function GuardrailPanel({ title = "Guardrails active", children }: Props) {
  return <aside className="rounded-lg border border-warning/25 bg-warning-soft p-5"><h2 className="text-lg font-bold">{title}</h2>{children}</aside>;
}

function setupActionNeeded(status: string, description?: string) {
  return /(disabled|not configured|blocked|setup|action required|missing|unavailable)/i.test(`${status} ${description ?? ""}`);
}

export function ProviderStatusCard({ title, status = "Disabled", description, tone = "warning", actionHref = "/studio/onboarding", actionLabel = "Open Guided Setup" }: { title: string; status?: string; description?: string; tone?: Tone; actionHref?: string; actionLabel?: string }) {
  const needsAction = setupActionNeeded(status, description);
  return <Card className="grid gap-4">
    <div className="flex items-start justify-between gap-3">
      <div><strong>{title}</strong>{description && <p className="m-0 mt-1 text-muted-foreground">{description}</p>}</div>
      <StatusBadge status={status} tone={tone} />
    </div>
    {needsAction ? <div className="action-bar">
      <a className="btn btn-secondary" href={actionHref}>{actionLabel}</a>
      <a className="btn btn-ghost" href="/studio/onboarding/help">Request setup help</a>
    </div> : null}
  </Card>;
}

export const IntegrationCard = ProviderStatusCard;
export const SiteToolToggleCard = ProviderStatusCard;
export const ProviderReadinessCard = ProviderStatusCard;
export const ProviderHealthCard = ProviderStatusCard;

export function SetupRequiredPanel({ title = "Setup required", items }: { title?: string; items: string[] }) {
  return <section className="rounded-lg border border-destructive/20 bg-destructive-soft p-5" aria-label={title}>
    <strong>{title}</strong>
    <ul className="mt-2 list-disc pl-5">{items.length ? items.map((item) => <li key={item}>{item}</li>) : <li>No setup blockers recorded.</li>}</ul>
  </section>;
}

export function ConnectionStatusBadge({ status }: { status: string }) {
  const tone: Tone =
    ["ready", "connected"].includes(status) ? "success" :
      ["invalid", "admin_setup_required"].includes(status) ? "danger" :
        ["future", "owner_gated", "disabled_for_safety"].includes(status) ? "warning" :
          "info";
  return <StatusBadge status={status} tone={tone} />;
}

export function MaskedCredentialStatus({ label = "Credential", value }: { label?: string; value?: string | null | undefined }) {
  return <div className="setup-masked-status"><span>{label}</span><strong>{value || "Not saved"}</strong></div>;
}

export function SecureCredentialInput({ name = "token", label, helper }: { name?: string; label: string; helper: string }) {
  return <label className="setup-secure-field">
    <span>{label}</span>
    <input name={name} type="password" autoComplete="off" placeholder="Paste token securely" aria-describedby={`${name}-helper`} />
    <small id={`${name}-helper`}>{helper}</small>
  </label>;
}

export function ValidateConnectionButton({ children = "Validate connection", disabledReason }: { children?: React.ReactNode; disabledReason?: string }) {
  return <button className="btn btn-primary" type="submit" disabled={Boolean(disabledReason)} title={disabledReason || undefined} aria-disabled={Boolean(disabledReason)}>{children}</button>;
}

export function WhereToFindThisPanel({ title = "Where do I get this?", steps, providerUrl, securityNote }: { title?: string; steps: string[]; providerUrl?: string | undefined; securityNote?: string | undefined }) {
  return <section className="setup-guide-panel">
    <h3>{title}</h3>
    <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
    {providerUrl ? <a className="btn btn-ghost" href={providerUrl} target="_blank" rel="noreferrer">Open provider dashboard</a> : null}
    {securityNote ? <p className="setup-security-note">{securityNote}</p> : null}
  </section>;
}

export function AdvancedConfigDetails({ envVars, notes }: { envVars: string[]; notes: string[] }) {
  return <details className="setup-advanced-details">
    <summary>Advanced / Developer details</summary>
    <p>These names are for local development, CI, or server deployment. Customers should use Guided Setup first.</p>
    <div className="setup-env-list">{envVars.length ? envVars.map((item) => <code key={item}>{item}</code>) : <span>No deployment variables listed.</span>}</div>
    <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
  </details>;
}

export function RequestSetupHelpButton({ href = "/studio/onboarding/help" }: { href?: string }) {
  return <a className="btn btn-secondary" href={href}>Request setup help</a>;
}

export function OwnerGatedActionNotice({ title = "Owner gate active", children }: Props) {
  return <aside className="owner-gated-notice"><StatusBadge status="owner gated" tone="warning" /><div><strong>{title}</strong>{children}</div></aside>;
}

export function SetupProviderCard({
  label,
  status,
  explanation,
  whyItMatters,
  primaryAction,
  setupGuideAction,
  validationAction,
  requestHelpAction,
  setupRequired = [],
  dangerousActionsBlocked = [],
  advancedEnvVars = [],
  advancedNotes = [],
  maskedDisplayValue
}: {
  label: string;
  status: string;
  explanation: string;
  whyItMatters: string;
  primaryAction: { label: string; href: string };
  setupGuideAction: { label: string; href: string };
  validationAction?: { label: string; href: string } | undefined;
  requestHelpAction: { label: string; href: string };
  setupRequired?: string[];
  dangerousActionsBlocked?: string[];
  advancedEnvVars?: string[];
  advancedNotes?: string[];
  maskedDisplayValue?: string | null | undefined;
}) {
  return <article className="setup-provider-card">
    <div className="setup-provider-card-header">
      <div>
        <h3>{label}</h3>
        <p>{explanation}</p>
      </div>
      <ConnectionStatusBadge status={status} />
    </div>
    <p className="setup-provider-why"><strong>Why it matters:</strong> {whyItMatters}</p>
    <MaskedCredentialStatus value={maskedDisplayValue} />
    {setupRequired.length ? <div className="setup-required-list"><strong>Next setup step</strong><ul>{setupRequired.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
    {dangerousActionsBlocked.length ? <div className="setup-safety-list"><strong>Safety guardrails</strong><ul>{dangerousActionsBlocked.map((item) => <li key={item}>{item.replace(/_/g, " ")}</li>)}</ul></div> : null}
    <div className="action-bar">
      <a className="btn btn-primary" href={primaryAction.href}>{primaryAction.label}</a>
      <a className="btn btn-ghost" href={setupGuideAction.href}>{setupGuideAction.label}</a>
      {validationAction ? <a className="btn btn-secondary" href={validationAction.href}>{validationAction.label}</a> : null}
      <a className="btn btn-secondary" href={requestHelpAction.href}>{requestHelpAction.label}</a>
    </div>
    <AdvancedConfigDetails envVars={advancedEnvVars} notes={advancedNotes} />
  </article>;
}

export function ProviderResultPanel({ title = "Provider result", status, children }: Props & { status?: string }) {
  return <Card>
    <div className="flex items-start justify-between gap-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {status ? <StatusBadge status={status} tone={status === "success" || status === "ready" ? "success" : status === "failed" ? "danger" : "warning"} /> : null}
    </div>
    <div className="provider-result">{children}</div>
  </Card>;
}

export function AiReadinessScoreCard({ title, score }: { title: string; score: number }) {
  return <Card className="flex items-center justify-between"><div><p className="font-bold text-muted-foreground">{title}</p><strong className="text-3xl">{score}<span className="text-base text-muted-foreground">/100</span></strong><span className="block text-xs font-bold text-primary">Configuration score</span></div><ProgressRing value={score} /></Card>;
}

export function AiEmployeeCard({ name, role, status = "Disabled", tasks = "0", description }: { name: string; role: string; status?: string; tasks?: string; description?: string }) {
  return <article className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-border bg-card p-5 shadow-card"><div className="grid size-9 place-items-center rounded-md bg-sand font-extrabold text-navy" aria-hidden="true">AI</div><div><h3 className="mb-1 font-bold">{name}</h3><p className="m-0 text-muted-foreground">{role}</p>{description && <small>{description}</small>}</div><StatusBadge status={status} tone={status === "Active" ? "success" : "warning"} /><span className="col-span-2 col-start-2 text-xs text-muted-foreground">{tasks} tasks</span></article>;
}

export function AiEmployeeStatusList({ employees }: { employees: Array<{ name: string; role: string; status: string }> }) {
  return <div className="grid gap-3">{employees.map((employee) => <AiEmployeeCard key={employee.name} {...employee} />)}</div>;
}

export function RecommendationCard({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <section className="rounded-lg border border-border bg-gradient-to-br from-card to-primary-soft p-5 shadow-card"><strong>{title}</strong><p>{description}</p>{action}</section>;
}

export function BlockerCard({ title, blockers }: { title: string; blockers: string[] }) {
  return <section className="rounded-lg border border-destructive/20 bg-destructive-soft p-5"><strong>{title}</strong><ul className="mt-2 list-disc pl-5">{blockers.length ? blockers.map((blocker) => <li key={blocker}>{blocker}</li>) : <li>No blockers recorded.</li>}</ul></section>;
}

export function NextActionCard({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <section className="rounded-lg border border-border bg-gradient-to-br from-card to-sand p-5 shadow-card"><strong>{title}</strong><p>{description}</p>{action}</section>;
}

export function ProductPipelineCard({ title, stages }: { title: string; stages: Array<{ label: string; status: string; complete?: boolean }> }) {
  return <Card><h2 className="text-lg font-bold">{title}</h2><WorkflowProgress steps={stages} /></Card>;
}

export function PrintifyCatalogCard({ title, description, children }: Props) {
  return <Card className="border-border-strong"><h2 className="text-lg font-bold">{title}</h2>{description && <p className="text-muted-foreground">{description}</p>}{children}</Card>;
}

export function ImageGenerationJobCard({ title, status, prompt }: { title: string; status: string; prompt?: string }) {
  return <Card className="flex items-start justify-between gap-4"><div><h3 className="font-bold">{title}</h3>{prompt && <p className="m-0 text-muted-foreground">{prompt}</p>}</div><StatusBadge status={status} tone={status === "completed" ? "success" : status === "failed" ? "danger" : "warning"} /></Card>;
}

export function VariantMarginMatrix({ rows }: { rows: Array<{ variant: string; cost: string; price: string; margin: string; status: string }> }) {
  return <DataTable columns={["Variant", "Cost", "Price", "Margin", "Status"]} rows={rows.map((row) => [row.variant, row.cost, row.price, row.margin, <StatusBadge key={row.variant} status={row.status} tone={row.status === "ready" || row.status === "healthy" ? "success" : "warning"} />])} />;
}

export const PublishGateChecklist = ApprovalGateList;

export function LaunchPacketSection({ title, children }: Props) {
  return <Card className="border-border-strong"><h2 className="text-lg font-bold">{title}</h2>{children}</Card>;
}

export function SourceLabel({ label }: { label: string }) {
  return <span className="inline-flex rounded-full bg-sand px-2.5 py-1 text-xs font-extrabold text-navy">{label}</span>;
}

export function FutureIntegrationBadge({ label = "Future integration" }: { label?: string }) {
  return <StatusBadge status={label} tone="warning" />;
}

export function ProductArt({ label = "Salty Cowhide" }: { label?: string; variant?: string }) {
  return <div className="product-art"><span>{label}</span></div>;
}

export function ProductCard({ title, price, description, badge }: { title: string; price?: string; description?: string; badge?: string }) {
  return <article className="relative rounded-lg border border-border bg-card p-4 shadow-card"><ProductArt label={title} />{badge && <StatusBadge status={badge} tone="primary" />}<h3 className="my-3 font-bold">{title}</h3>{description && <p className="text-muted-foreground">{description}</p>}{price && <strong>{price}</strong>}</article>;
}

export function ProductGrid({ children }: Props) {
  return <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">{children}</div>;
}

export function ProductImageGallery({ title = "Coastal Cowboy Tee" }: { title?: string }) {
  return <div className="grid gap-4 md:grid-cols-[86px_1fr]"><div className="grid gap-2.5 sm:grid-cols-3 md:grid-cols-1"><ProductArt label="Front" /><ProductArt label="Back" /><ProductArt label="Detail" /></div><ProductArt label={title} /></div>;
}

export const ProductMockupPreview = ProductArt;

export function VariantSelector({ label, options }: { label: string; options: string[] }) {
  return <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0"><legend className="mb-2 w-full font-extrabold">{label}</legend>{options.map((option, index) => <button type="button" disabled title="Variant selection is disabled until checkout is configured." className={cn("rounded-md border border-border bg-card px-3 py-2", index === 0 && "border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]")} key={option}>{option}</button>)}</fieldset>;
}

export function PriceMarginPanel() {
  return <DashboardCard title="Pricing & Margin"><div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-muted-foreground"><span>Cost</span><strong className="text-foreground">$12.95</strong><span>Price</span><strong className="text-foreground">$32.00</strong><span>Margin</span><strong className="text-foreground">Healthy</strong></div></DashboardCard>;
}

export function StructuredDataPreview({ title = "Product JSON-LD" }: { title?: string }) {
  return <pre className="code-block">{`{\n  "@type": "Product",\n  "name": "${title}",\n  "availability": "review_required"\n}`}</pre>;
}

export const SearchCommand = () => <label className="search-field" title="Workspace search will become available after a search index is configured."><span>Workspace search</span><input placeholder="Find a Studio workflow" aria-label="Workspace search is not configured yet" disabled /></label>;
export const NotificationBell = () => <button className="icon-button" aria-label="Notifications not configured" disabled title="Notifications are not configured yet."><Bell size={16} aria-hidden="true" /><span>0</span></button>;
export const UserMenu = () => <button className="user-menu" aria-label="Studio owner menu not configured" disabled title="User menu actions are not configured yet."><CircleUserRound size={20} aria-hidden="true" /><span>Studio Owner<small>Authenticated session</small></span></button>;
export const WorkspaceSwitcher = () => <button className="workspace-switcher" disabled title="Single workspace is active in this local Studio session."><Building2 size={16} aria-hidden="true" />Salty Cowhide <span aria-hidden="true">v</span></button>;

export function ActionBar({ children }: Props) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

export const ActionButtonGroup = ActionBar;

type BentoSpan = "sm" | "md" | "lg" | "wide" | "tall" | "hero";
type BentoTone = Tone | "ink" | "sand" | "coral" | "seafoam";

const bentoSpanClass: Record<BentoSpan, string> = {
  sm: "bento-span-sm",
  md: "bento-span-md",
  lg: "bento-span-lg",
  wide: "bento-span-wide",
  tall: "bento-span-tall",
  hero: "bento-span-hero"
};

const bentoToneClass: Record<BentoTone, string> = {
  neutral: "tone-neutral",
  success: "tone-success",
  warning: "tone-warning",
  danger: "tone-danger",
  info: "tone-info",
  primary: "tone-primary",
  ink: "tone-ink",
  sand: "tone-sand",
  coral: "tone-coral",
  seafoam: "tone-seafoam"
};

export function BentoGrid({ children, className }: Props) {
  return <section className={cn("bento-grid", className)}>{children}</section>;
}

export function BentoCard({ title, eyebrow, description, children, className, span = "md", tone = "neutral", action }: Props & { span?: BentoSpan; tone?: BentoTone; action?: React.ReactNode }) {
  return <article className={cn("bento-card", bentoSpanClass[span], bentoToneClass[tone], className)}>
    {(eyebrow || title || action) ? <header className="bento-card-header">
      <div>
        {eyebrow ? <p className="bento-eyebrow">{eyebrow}</p> : null}
        {title ? <h2>{title}</h2> : null}
      </div>
      {action ? <div className="bento-card-action">{action}</div> : null}
    </header> : null}
    {description ? <p className="bento-card-description">{description}</p> : null}
    {children}
  </article>;
}

export function BentoMetric({ label, value, detail, tone = "primary" }: { label: string; value: string; detail?: string; tone?: BentoTone }) {
  return <BentoCard className="bento-metric" tone={tone} span="sm" eyebrow={label}>
    <strong>{value}</strong>
    {detail ? <p>{detail}</p> : null}
  </BentoCard>;
}

export function BentoStatusPanel({ title, status, description, tone = "neutral", action }: { title: string; status: string; description: string; tone?: Tone; action?: React.ReactNode }) {
  return <BentoCard title={title} description={description} tone={tone} action={<StatusBadge status={status} tone={tone} />}>
    {action ? <div className="bento-card-footer">{action}</div> : null}
  </BentoCard>;
}

export function BentoWorkflowStep({ step, title, status, description, href, complete = false }: { step: string; title: string; status: string; description: string; href: string; complete?: boolean }) {
  return <a className={cn("bento-workflow-step", complete && "is-complete")} href={href}>
    <span>{step}</span>
    <strong>{title}</strong>
    <small>{description}</small>
    <StatusBadge status={status} tone={complete ? "success" : "warning"} />
  </a>;
}

export function BentoArtifactCard({ title, description, status, preview, action }: { title: string; description: string; status: string; preview?: React.ReactNode; action?: React.ReactNode }) {
  return <BentoCard className="bento-artifact-card" title={title} description={description} action={<StatusBadge status={status} tone={status.includes("ready") || status.includes("approved") ? "success" : "warning"} />}>
    {preview ? <div className="bento-artifact-preview">{preview}</div> : null}
    {action ? <div className="bento-card-footer">{action}</div> : null}
  </BentoCard>;
}

export function BentoProviderCard({ title, status, description, source, action }: { title: string; status: string; description: string; source?: string; action?: React.ReactNode }) {
  const ready = /(ready|connected|available)/i.test(status);
  return <BentoCard className="bento-provider-card" title={title} description={description} tone={ready ? "seafoam" : "sand"} action={<StatusBadge status={status} tone={ready ? "success" : "warning"} />}>
    {source ? <p className="bento-provider-source">{source}</p> : null}
    {action ? <div className="bento-card-footer">{action}</div> : null}
  </BentoCard>;
}

export function BentoActionPanel({ title, description, primaryAction, secondaryAction }: { title: string; description: string; primaryAction: React.ReactNode; secondaryAction?: React.ReactNode }) {
  return <BentoCard className="bento-action-panel" span="wide" tone="coral" title={title} description={description}>
    <div className="action-bar">{primaryAction}{secondaryAction}</div>
  </BentoCard>;
}

export const ProviderCard = BentoProviderCard;
export const ArtifactCard = BentoArtifactCard;
export const ProductDraftCard = BentoArtifactCard;
export const PublishGateCard = BentoStatusPanel;
export const SetupConciergeCard = BentoStatusPanel;

export function ApprovalActionBar({ children, label = "Approval actions" }: Props & { label?: string }) {
  return <div className="flex flex-wrap items-center gap-2.5" aria-label={label}>{children}</div>;
}

export function SplitPane({ children }: Props) {
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">{children}</div>;
}

export function DetailDrawer({ children, title }: Props) {
  return <aside className="rounded-lg border border-border bg-card p-5 shadow-card">{title && <h2 className="text-lg font-bold">{title}</h2>}{children}</aside>;
}

export const StudioAppShell = ({ children }: Props) => <div className="grid gap-3">{children}</div>;
export const StudioSidebar = ({ children }: Props) => <aside className="grid gap-3">{children}</aside>;
export const StudioTopNav = ({ children }: Props) => <header className="grid gap-3">{children}</header>;
export const CommandCenterHeader = PageHeader;
export const SectionHeader = ({ title, description, children }: Props) => <header className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">{title}</h2>{description && <p className="text-muted-foreground">{description}</p>}</div>{children}</header>;
export const EntityDetailLayout = ({ children }: Props) => <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">{children}</div>;
export const WorkflowCanvas = ({ children }: Props) => <section className="grid gap-5">{children}</section>;
export const StickyActionFooter = ({ children }: Props) => <div className="sticky bottom-4 z-10 flex justify-end gap-2.5 rounded-lg border border-border bg-card/90 p-3 shadow-floating backdrop-blur">{children}</div>;

export const ImpactBadge = ({ impact }: { impact: string }) => <StatusBadge status={impact} tone={impact === "high" ? "success" : impact === "critical" ? "danger" : "info"} />;
export const ProviderHealthBadge = ({ status }: { status: string }) => <StatusBadge status={status} tone={status === "connected" || status === "ready" ? "success" : "warning"} />;
export const ApprovalBadge = ({ status }: { status: string }) => <StatusBadge status={status} tone={status === "approved" ? "success" : status === "rejected" ? "danger" : "warning"} />;
export const SyncStatusBadge = ({ status }: { status: string }) => <StatusBadge status={status} tone={status.includes("created") || status === "synced" ? "success" : status === "failed" ? "danger" : "warning"} />;
export const ProfitabilityBadge = ({ status }: { status: string }) => <StatusBadge status={status} tone={status === "healthy" ? "success" : status === "blocked" ? "danger" : "warning"} />;
export const PipelineStageBadge = ({ label, status }: { label: string; status: string }) => <span className="grid gap-2 rounded-md border border-border bg-muted p-3"><strong>{label}</strong><StatusBadge status={status} tone={status === "complete" || status === "ready" ? "success" : "warning"} /></span>;

export function ProductPipelineBoard({ stages }: { stages: Array<{ label: string; status: string }> }) {
  return <Card className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">{stages.map((stage) => <PipelineStageBadge key={stage.label} {...stage} />)}</Card>;
}

export function OwnerDecisionPanel({ title, description, children }: Props) {
  return <Card className="border-border-strong"><h2 className="text-lg font-bold">{title}</h2>{description && <p>{description}</p>}<ApprovalActionBar>{children}</ApprovalActionBar></Card>;
}

export const BlueprintCard = ({ title, description, children }: Props) => <PrintifyCatalogCard title={title} description={description}>{children}</PrintifyCatalogCard>;
export const PrintProviderCard = BlueprintCard;

export function ArtworkPlacementPanel({ title = "Artwork placement", blockers = [] as string[] }: { title?: string; blockers?: string[] }) {
  return <Card><h2 className="text-lg font-bold">{title}</h2><div className="artwork-placement-preview"><span>Front</span></div>{blockers.length ? <BlockerCard title="Placement blockers" blockers={blockers} /> : <p className="text-muted-foreground">Centered placement: x 0.5, y 0.5, scale 1, angle 0.</p>}</Card>;
}

export const ArtworkPreviewPanel = ({ children, title = "Artwork preview" }: Props) => <Card><h2 className="text-lg font-bold">{title}</h2>{children}</Card>;
export const MockupPreviewCard = ({ children, title = "Mockup preview" }: Props) => <Card><h2 className="text-lg font-bold">{title}</h2>{children}</Card>;
export const ShopifyDraftCard = ({ title, status, children }: Props & { status?: string }) => <Card><h2 className="text-lg font-bold">{title}</h2>{status && <SyncStatusBadge status={status} />}{children}</Card>;

export const AiEmployeeResumePanel = ({ children, title = "Role resume" }: Props) => <Card><h2 className="text-lg font-bold">{title}</h2>{children}</Card>;
export const HiringRequestCard = ({ title, status, children }: Props & { status?: string }) => <Card><h2 className="text-lg font-bold">{title}</h2>{status && <ApprovalBadge status={status} />}{children}</Card>;
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
export const UnitEconomicsCard = ({ title, status, margin }: { title: string; status: string; margin: string }) => <Card><h2 className="text-lg font-bold">{title}</h2><ProfitabilityBadge status={status} /><p className="text-muted-foreground">Contribution margin: {margin}</p></Card>;
export const OpportunityCard = ({ title, description, children, action }: Props & { action?: React.ReactNode }) => <RecommendationCard title={title ?? "Opportunity"} description={description ?? ""} action={action ?? children} />;
export const DecisionMemoPanel = ({ title, children }: Props) => <Card><h2 className="text-lg font-bold">{title}</h2>{children}</Card>;
export const ForecastScenarioCard = DecisionMemoPanel;
export const AssumptionEditor = ({ children, title = "Assumptions" }: Props) => <Card><h2 className="text-lg font-bold">{title}</h2>{children}</Card>;
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
export const BusinessCardPreview = ({ svg }: { svg: string }) => <div className="business-card-preview" dangerouslySetInnerHTML={{ __html: svg }} />;
