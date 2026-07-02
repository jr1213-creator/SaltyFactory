"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@saltyfactory/ui";

type ApprovalItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  sourceLabel: string;
  createdBy: string;
  riskFlags: string[];
  preview: string;
  nextAction: string;
};

const reviewableStatuses = new Set(["draft", "pending_review", "needs_review", "ready_for_owner_review"]);
const blockedStatuses = new Set(["provider_not_configured", "setup_needed", "manual_input_required", "blocked_by_guardrail"]);

function clean(value: string) {
  return value.replace(/_/g, " ");
}

function isAiOutput(item: ApprovalItem) {
  return item.id.startsWith("aiout_");
}

function canReview(item: ApprovalItem) {
  return isAiOutput(item) && reviewableStatuses.has(item.status);
}

function blockerText(item: ApprovalItem) {
  if (!isAiOutput(item)) return "Run AI employees to persist this preview item, or use its route-specific workflow.";
  if (blockedStatuses.has(item.status)) return item.riskFlags.length ? item.riskFlags.join(", ") : clean(item.status);
  if (!reviewableStatuses.has(item.status)) return clean(item.status || "not review-ready");
  return "";
}

export function AiApprovalQueueClient({ initialItems }: { initialItems: ApprovalItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const actionableCount = useMemo(() => items.filter(canReview).length, [items]);

  async function decide(item: ApprovalItem, decision: "approve" | "reject" | "needs_edits" | "convert_to_task") {
    if (!isAiOutput(item)) return;
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/studio/ai-employees/outputs/${encodeURIComponent(item.id)}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, notes: notesById[item.id] ?? "" })
      });
      const data = await response.json();
      setResult(data);
      if (data.output && typeof data.output === "object") {
        const output = data.output as Record<string, unknown>;
        setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: String(output.status ?? row.status) } : row));
      }
      if (decision === "convert_to_task" && data.ok !== false) {
        setItems((current) => current.map((row) => row.id === item.id ? { ...row, nextAction: "Task created for owner follow-up." } : row));
      }
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to update AI employee output." });
    } finally {
      setBusyId("");
    }
  }

  return <section className="sf-card" style={{ marginTop: 18 }}>
    <div className="sf-card-header">
      <div>
        <h2>Approval Queue</h2>
        <p className="sf-muted">Persisted AI outputs can be approved, rejected, sent back for edits, or converted to manual tasks. Provider actions stay disabled.</p>
      </div>
      <StatusBadge status={`${actionableCount} actionable`} tone={actionableCount ? "warning" : "success"} />
    </div>
    <div className="sf-stack">
      {items.length ? items.slice(0, 12).map((item) => {
        const reviewReady = canReview(item);
        const blocker = blockerText(item);
        const busy = busyId === item.id;
        const expanded = expandedId === item.id;
        return <article key={`${item.type}-${item.id}`} className="sf-card" style={{ boxShadow: "none" }}>
          <div className="sf-card-header">
            <div>
              <h3 style={{ margin: 0 }}>{item.title}</h3>
              <p className="sf-muted" style={{ margin: "4px 0 0" }}>{clean(item.type)} · {item.sourceLabel} · {item.createdBy}</p>
            </div>
            <StatusBadge status={clean(item.status)} tone={reviewReady ? "warning" : blockedStatuses.has(item.status) ? "danger" : "info"} />
          </div>
          <p>{item.preview}</p>
          <p className="sf-muted">Next action: {item.nextAction}</p>
          {blocker ? <p className="sf-alert">Blocked: {blocker}</p> : null}
          <div className="sf-form-grid">
            <label>Review note<input value={notesById[item.id] ?? ""} onChange={(event) => setNotesById((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Optional owner note" /></label>
          </div>
          <div className="sf-action-bar">
            <button className="sf-button sf-button-secondary" type="button" onClick={() => setExpandedId(expanded ? "" : item.id)}>View details</button>
            <button className="sf-button sf-button-primary" type="button" disabled={!reviewReady || busy} onClick={() => decide(item, "approve")}>Approve</button>
            <button className="sf-button sf-button-danger" type="button" disabled={!reviewReady || busy} onClick={() => decide(item, "reject")}>Reject</button>
            <button className="sf-button sf-button-secondary" type="button" disabled={!reviewReady || busy} onClick={() => decide(item, "needs_edits")}>Needs edits</button>
            <button className="sf-button sf-button-secondary" type="button" disabled={!isAiOutput(item) || busy} onClick={() => decide(item, "convert_to_task")}>Convert to task</button>
            {item.type === "listing_draft"
              ? <a className="sf-button sf-button-secondary" href="/studio/listing-drafts">Edit draft</a>
              : <button className="sf-button sf-button-secondary" type="button" disabled>Edit draft</button>}
          </div>
          {expanded ? <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{JSON.stringify(item, null, 2)}</pre> : null}
        </article>;
      }) : <div className="sf-empty"><h3>No approval items</h3><p>Run AI employees or create workflow drafts to populate the owner approval queue.</p></div>}
    </div>
    {result ? <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 260, overflow: "auto", marginTop: 14 }}>{JSON.stringify(result, null, 2)}</pre> : null}
  </section>;
}
