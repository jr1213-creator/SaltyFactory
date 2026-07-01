"use client";

import { useState } from "react";

const roles = [
  ["trend_scout", "Trend Scout"],
  ["product_strategist", "Product Strategist"],
  ["design_brief_writer", "Design Brief Writer"],
  ["image_qa_assistant", "Image QA Assistant"],
  ["listing_manager", "Listing Manager"],
  ["seo_specialist", "SEO Specialist"],
  ["aeo_specialist", "AEO Specialist"],
  ["geo_specialist", "GEO Specialist"],
  ["analytics_analyst", "Analytics Analyst"],
  ["publishing_assistant", "Publishing Assistant"],
  ["margin_manager", "Margin Manager"]
] as const;

export function AiEmployeeWorkflowClient() {
  const [role, setRole] = useState("trend_scout");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const response = await fetch("/api/studio/ai-employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employee_role: role })
    });
    setResult(await response.json());
    setBusy(false);
  }

  return <section className="sf-card" style={{ marginTop: 18 }}>
    <h2>Run Deterministic Worker</h2>
    <p className="sf-muted">Runs create draft recommendations/tasks only. They cannot publish, provider-sync, send, or spend.</p>
    <div className="sf-form-grid">
      <label>Employee role<select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <button className="sf-button sf-button-primary" disabled={busy} onClick={run}>Run Employee</button>
    </div>
    {result && <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>}
  </section>;
}
