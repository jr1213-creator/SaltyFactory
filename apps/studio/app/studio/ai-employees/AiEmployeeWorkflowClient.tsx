"use client";

import { useState } from "react";

const roles = [
  ["trend_research_analyst", "Trend Research Analyst"],
  ["trend_report_writer", "Trend Report Writer"],
  ["product_strategy_assistant", "Product Strategy Assistant"],
  ["pod_migration_assistant", "POD Product Builder Assistant"],
  ["design_concept_assistant", "Design Concept Assistant"],
  ["image_generation_assistant", "Image Generation Assistant"],
  ["product_listing_assistant", "Product Listing Assistant"],
  ["pricing_margin_assistant", "Pricing & Margin Assistant"],
  ["social_content_assistant", "Social Content Assistant"],
  ["operations_checklist_assistant", "Operations Checklist Assistant"]
] as const;

const runModes = [
  ["daily_pod_planning", "Daily POD planning"],
  ["trend_report_generation", "Trend report generation"],
  ["product_idea_generation", "Product idea generation"],
  ["listing_draft_generation", "Listing draft generation"],
  ["launch_readiness_check", "Launch readiness check"],
  ["marketing_draft_generation", "Marketing draft generation"]
] as const;

export function AiEmployeeWorkflowClient() {
  const [role, setRole] = useState("trend_research_analyst");
  const [runMode, setRunMode] = useState("daily_pod_planning");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function runSingleEmployee() {
    setBusy(true);
    try {
      const response = await fetch("/api/studio/ai-employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employee_role: role })
      });
      setResult(await response.json());
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to run employee." });
    } finally {
      setBusy(false);
    }
  }

  async function runAgenticWorkflow() {
    setBusy(true);
    try {
      const response = await fetch("/api/studio/ai-employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentic: true, run_mode: runMode })
      });
      setResult(await response.json());
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to run AI employees." });
    } finally {
      setBusy(false);
    }
  }

  return <section className="surface-card" style={{ marginTop: 18 }}>
    <h2>Run AI Employees</h2>
    <p className="text-muted">Runs safe internal draft tasks only. AI employees cannot publish, sync, post, submit feeds, send messages, change DNS, or spend money.</p>
    <div className="form-grid">
      <label>Run mode<select value={runMode} onChange={(event) => setRunMode(event.target.value)}>{runModes.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <button className="btn btn-primary" disabled={busy} onClick={runAgenticWorkflow}>Run AI Employees</button>
      <label>Single employee<select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <button className="btn" disabled={busy} onClick={runSingleEmployee}>Run Single Draft</button>
    </div>
    {result && <div className="stack-list" style={{ marginTop: 12 }}>
      <p className="text-muted">Status: {result.status || "unknown"}{result.workflow?.approvalQueue ? ` - ${result.workflow.approvalQueue.length} approval items` : ""}</p>
      <pre className="code-block" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>
    </div>}
  </section>;
}
