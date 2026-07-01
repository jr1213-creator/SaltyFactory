"use client";

import { useState } from "react";

type Integration = { key: string; label: string; status: string; setupRequired: string[]; capabilities: string[] };

export function IntegrationActionsClient({ integrations }: { integrations: Integration[] }) {
  const [result, setResult] = useState<any>(null);
  const [busyProvider, setBusyProvider] = useState("");

  async function call(provider: string, action: "status" | "test" | "sync") {
    setBusyProvider(`${provider}:${action}`);
    const response = await fetch(`/api/studio/integrations/${provider}/${action}`, { method: action === "status" ? "GET" : "POST" });
    setResult(await response.json());
    setBusyProvider("");
  }

  return <section className="sf-card" style={{ marginTop: 18 }}>
    <h2>Provider Actions</h2>
    <div className="sf-stack">
      {integrations.map((item) => <div key={item.key} className="sf-panel" style={{ display: "grid", gap: 10 }}>
        <div><strong>{item.label}</strong><p className="sf-muted">{item.status.replace(/_/g, " ")} · {item.capabilities.join(", ") || "No live capabilities configured"}</p></div>
        <div className="sf-action-bar">
          <button className="sf-button sf-button-secondary" disabled={busyProvider !== ""} onClick={() => call(item.key, "status")}>Status</button>
          <button className="sf-button sf-button-secondary" disabled={busyProvider !== ""} onClick={() => call(item.key, "test")}>Test</button>
          <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !["connected"].includes(item.status)} onClick={() => call(item.key, "sync")}>Sync Now</button>
        </div>
        {item.setupRequired.length ? <p className="sf-muted">Setup required: {item.setupRequired.join(", ")}</p> : null}
      </div>)}
    </div>
    {result && <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>}
  </section>;
}
