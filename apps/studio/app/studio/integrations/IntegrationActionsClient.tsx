"use client";

import { useState } from "react";

type Integration = {
  key: string;
  label: string;
  status: string;
  setupRequired: string[];
  capabilities: string[];
  scopes?: string[] | undefined;
  selectedPropertyId?: string | null | undefined;
  selectedSiteUrl?: string | null | undefined;
  selectedAccountId?: string | null | undefined;
  selectedLocationId?: string | null | undefined;
  googleEmail?: string | null | undefined;
  credentialStored?: boolean | undefined;
  lastSuccessfulSync?: string | null | undefined;
};

type GoogleCandidate = {
  id: string;
  label: string;
  type: "ga4_property" | "search_console_site" | "gbp_location";
  confidence: "high" | "medium" | "low";
  matchReason: string;
  url?: string | null;
  accountId?: string | null;
  propertyId?: string | null;
  siteUrl?: string | null;
  locationId?: string | null;
};

export function IntegrationActionsClient({ integrations }: { integrations: Integration[] }) {
  const [result, setResult] = useState<any>(null);
  const [busyProvider, setBusyProvider] = useState("");
  const [manualSetupOpen, setManualSetupOpen] = useState(false);
  const google = integrations.find((item) => item.key === "google_oauth");
  const ga4 = integrations.find((item) => item.key === "ga4");
  const gsc = integrations.find((item) => item.key === "google_search_console");
  const gbp = integrations.find((item) => item.key === "google_business_profile");
  const [ga4PropertyId, setGa4PropertyId] = useState(google?.selectedPropertyId ?? ga4?.selectedPropertyId ?? "");
  const [siteUrl, setSiteUrl] = useState(google?.selectedSiteUrl ?? gsc?.selectedSiteUrl ?? "");
  const [gbpAccountId, setGbpAccountId] = useState(google?.selectedAccountId ?? gbp?.selectedAccountId ?? "");
  const [gbpLocationId, setGbpLocationId] = useState(google?.selectedLocationId ?? gbp?.selectedLocationId ?? "");

  async function call(provider: string, action: "status" | "test" | "sync") {
    setBusyProvider(`${provider}:${action}`);
    try {
      const routeProvider = provider === "supabase_storage" ? "supabase-storage" : provider;
      const response = await fetch(`/api/studio/integrations/${routeProvider}/${action}`, { method: action === "status" ? "GET" : "POST" });
      setResult(await response.json());
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to run provider action." });
    } finally {
      setBusyProvider("");
    }
  }

  async function googleAction(action: "connect" | "disconnect" | "test" | "configure" | "autoDetect" | "ga4" | "gsc" | "gbp") {
    setBusyProvider(`google:${action}`);
    try {
      const routes = {
        connect: "/api/studio/integrations/google/oauth/start",
        disconnect: "/api/studio/integrations/google/disconnect",
        test: "/api/studio/integrations/google/test",
        configure: "/api/studio/integrations/google/configure",
        autoDetect: "/api/studio/integrations/google/auto-detect",
        ga4: "/api/studio/integrations/google/analytics/sync",
        gsc: "/api/studio/integrations/google/search-console/sync",
        gbp: "/api/studio/integrations/google/business-profile/sync"
      };
      const init: RequestInit = action === "connect"
        ? { method: "GET" }
        : { method: "POST", headers: { "content-type": "application/json" } };
      if (action === "configure") {
        init.body = JSON.stringify({
          ga4_property_id: ga4PropertyId,
          search_console_site_url: siteUrl,
          gbp_account_id: gbpAccountId,
          gbp_location_id: gbpLocationId
        });
      }
      const response = await fetch(routes[action], init);
      const data = await response.json();
      setResult(data);
      if (action === "connect" && data.authorizationUrl) window.location.href = data.authorizationUrl;
      if (action === "autoDetect" && data?.ok) {
        const saved = data.autoSaved ?? {};
        const detectedGa4 = saved.ga4PropertyId ?? data.dataSources?.ga4?.selected?.propertyId ?? "";
        const detectedGsc = saved.searchConsoleSiteUrl ?? data.dataSources?.searchConsole?.selected?.siteUrl ?? "";
        const detectedGbpAccount = saved.businessProfileAccountId ?? data.dataSources?.businessProfile?.selected?.accountId ?? "";
        const detectedGbpLocation = saved.businessProfileLocationId ?? data.dataSources?.businessProfile?.selected?.locationId ?? "";
        if (detectedGa4) setGa4PropertyId(detectedGa4);
        if (detectedGsc) setSiteUrl(detectedGsc);
        if (detectedGbpAccount) setGbpAccountId(detectedGbpAccount);
        if (detectedGbpLocation) setGbpLocationId(detectedGbpLocation);
      }
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to run Google integration action." });
    } finally {
      setBusyProvider("");
    }
  }

  const googleConnected = google?.status === "connected" && google.credentialStored !== false;
  const googleDisabledReason = googleConnected ? "" : "Connect and verify Google OAuth first.";
  const detected = result?.provider === "google_oauth" && result?.dataSources ? result : null;
  const ga4Candidates = (detected?.dataSources?.ga4?.candidates ?? []) as GoogleCandidate[];
  const gscCandidates = (detected?.dataSources?.searchConsole?.candidates ?? []) as GoogleCandidate[];
  const gbpCandidates = (detected?.dataSources?.businessProfile?.candidates ?? []) as GoogleCandidate[];

  function candidateLabel(candidate: GoogleCandidate) {
    const details = [candidate.url, candidate.confidence, candidate.matchReason].filter(Boolean).join(" - ");
    return details ? `${candidate.label} (${details})` : candidate.label;
  }

  return <section className="sf-card" style={{ marginTop: 18 }}>
    <h2>Provider Actions</h2>
    <div className="sf-panel" style={{ display: "grid", gap: 12, marginBottom: 16 }}>
      <div>
        <strong>Google data sources</strong>
        <p className="sf-muted">{google?.status.replace(/_/g, " ") ?? "not configured"} - {google?.googleEmail ? `Connected as ${google.googleEmail}` : "No Google email verified yet"}</p>
        <p className="sf-muted">Scopes: {(google?.scopes ?? []).join(", ") || "Not connected"}</p>
      </div>
      <div className="sf-action-bar">
        <button className="sf-button sf-button-primary" disabled={busyProvider !== ""} onClick={() => googleAction("connect")}>Connect Google</button>
        <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected} title={googleConnected ? "Disconnect stored Google OAuth credential." : googleDisabledReason} onClick={() => googleAction("disconnect")}>Disconnect Google</button>
        <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected} title={googleConnected ? "Run a live userinfo verification call." : googleDisabledReason} onClick={() => googleAction("test")}>Test Connection</button>
        <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected} title={googleConnected ? "Discover GA4, Search Console, and Business Profile resources available to this Google account." : googleDisabledReason} onClick={() => googleAction("autoDetect")}>Auto-detect Google setup</button>
      </div>
      <div className="sf-panel" style={{ display: "grid", gap: 10 }}>
        <strong>Google setup flow</strong>
        <p className="sf-muted">1. Connect Google OAuth. 2. Auto-detect available Google resources. 3. Select or confirm GA4 and Search Console. 4. Sync data. Google Business Profile is optional for online-only Salty Cowhide POD launch readiness.</p>
        {detected ? <div className="sf-grid sf-grid-3">
          <div><strong>GA4</strong><p className="sf-muted">{detected.dataSources.ga4.message}</p></div>
          <div><strong>Search Console</strong><p className="sf-muted">{detected.dataSources.searchConsole.message}</p></div>
          <div><strong>Google Business Profile</strong><p className="sf-muted">{detected.dataSources.businessProfile.message}</p></div>
        </div> : null}
      </div>
      {ga4Candidates.length || gscCandidates.length || gbpCandidates.length ? <div className="sf-form-grid">
        {ga4Candidates.length ? <label>Detected GA4 property<select value={ga4PropertyId} onChange={(event) => setGa4PropertyId(event.target.value)}>
          <option value="">Select GA4 property</option>
          {ga4Candidates.map((candidate) => <option key={candidate.id} value={candidate.propertyId ?? candidate.id}>{candidateLabel(candidate)}</option>)}
        </select></label> : null}
        {gscCandidates.length ? <label>Detected Search Console property<select value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)}>
          <option value="">Select Search Console property</option>
          {gscCandidates.map((candidate) => <option key={candidate.id} value={candidate.siteUrl ?? candidate.id}>{candidateLabel(candidate)}</option>)}
        </select></label> : null}
        {gbpCandidates.length ? <label>Detected Business Profile location<select value={gbpLocationId ? `${gbpAccountId}:${gbpLocationId}` : ""} onChange={(event) => {
          const [accountId, ...locationParts] = event.target.value.split(":");
          setGbpAccountId(accountId ?? "");
          setGbpLocationId(locationParts.join(":"));
        }}>
          <option value="">Select optional GBP location</option>
          {gbpCandidates.map((candidate) => <option key={candidate.id} value={`${candidate.accountId ?? ""}:${candidate.locationId ?? ""}`}>{candidateLabel(candidate)}</option>)}
        </select></label> : null}
      </div> : null}
      <div className="sf-form-grid">
        {manualSetupOpen ? <>
          <label>GA4 property ID<input value={ga4PropertyId} onChange={(event) => setGa4PropertyId(event.target.value)} placeholder="123456789" /></label>
          <label>Search Console site URL<input value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://example.com/" /></label>
          <label>GBP account ID<input value={gbpAccountId} onChange={(event) => setGbpAccountId(event.target.value)} placeholder="accounts/{real-account-id}" /></label>
          <label>GBP location ID<input value={gbpLocationId} onChange={(event) => setGbpLocationId(event.target.value)} placeholder="locations/{real-location-id}" /></label>
        </> : null}
      </div>
      <div className="sf-action-bar">
        <button className="sf-button sf-button-secondary" disabled={busyProvider !== ""} onClick={() => setManualSetupOpen((value) => !value)}>Manual setup</button>
        <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected || (!ga4PropertyId && !siteUrl && (!gbpAccountId || !gbpLocationId))} title={!googleConnected ? googleDisabledReason : "Save selected Google resources as configured, then run sync to verify."} onClick={() => googleAction("configure")}>Save selected Google resources</button>
        <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected || !ga4PropertyId} title={!googleConnected ? googleDisabledReason : !ga4PropertyId ? "Configure GA4 property ID first." : "Import GA4 read-only metrics."} onClick={() => googleAction("ga4")}>Sync GA4</button>
        <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected || !siteUrl} title={!googleConnected ? googleDisabledReason : !siteUrl ? "Configure Search Console site URL first." : "Import Search Console read-only search performance."} onClick={() => googleAction("gsc")}>Sync Search Console</button>
        <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected || !gbpAccountId || !gbpLocationId} title={!googleConnected ? googleDisabledReason : !gbpAccountId || !gbpLocationId ? "Configure GBP account and location first." : "Import GBP read-only account, location, and review summary."} onClick={() => googleAction("gbp")}>Sync Business Profile</button>
      </div>
      {(google?.setupRequired ?? []).length ? <p className="sf-muted">Google setup required: {google?.setupRequired.join(", ")}</p> : null}
    </div>
    <div className="sf-stack">
      {integrations.map((item) => <div key={item.key} className="sf-panel" style={{ display: "grid", gap: 10 }}>
        <div><strong>{item.label}</strong><p className="sf-muted">{item.status.replace(/_/g, " ")} - {item.capabilities.join(", ") || "No live capabilities configured"}</p></div>
        <div className="sf-action-bar">
          <button className="sf-button sf-button-secondary" disabled={busyProvider !== ""} onClick={() => call(item.key, "status")}>Status</button>
          <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || ["google_oauth", "ga4", "google_search_console", "google_business_profile"].includes(item.key)} title={["google_oauth", "ga4", "google_search_console", "google_business_profile"].includes(item.key) ? "Use the Google test and sync buttons above." : undefined} onClick={() => call(item.key, "test")}>Test</button>
          <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !["connected"].includes(item.status) || ["google_oauth", "ga4", "google_search_console", "google_business_profile"].includes(item.key)} title={["google_oauth", "ga4", "google_search_console", "google_business_profile"].includes(item.key) ? "Use the Google data source sync buttons above." : undefined} onClick={() => call(item.key, "sync")}>Sync Now</button>
        </div>
        {item.setupRequired.length ? <p className="sf-muted">Setup required: {item.setupRequired.join(", ")}</p> : null}
        {item.lastSuccessfulSync ? <p className="sf-muted">Last sync: {item.lastSuccessfulSync}</p> : null}
      </div>)}
    </div>
    {result && <pre className="sf-code" style={{ whiteSpace: "pre-wrap", maxHeight: 240, overflow: "auto" }}>{JSON.stringify(result, null, 2)}</pre>}
  </section>;
}
