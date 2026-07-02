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
  matchStrength: "exact_domain_match" | "brand_match" | "likely_related" | "unrelated" | "unknown";
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
  const [gbpEligibility, setGbpEligibility] = useState("online_only_ecommerce_pod");
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

  async function googleSetupAction(action: "ga4_create" | "search_console_add" | "merchant_center_setup" | "gbp_eligibility") {
    setBusyProvider(`google:${action}`);
    try {
      const response = await fetch("/api/studio/integrations/google/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, eligibility: gbpEligibility })
      });
      const data = await response.json();
      setResult(data);
      if (data?.authorizationUrl) window.location.href = data.authorizationUrl;
      if (data?.configuration?.propertyId) setGa4PropertyId(String(data.configuration.propertyId));
      if (data?.configuration?.selectedSiteUrl) setSiteUrl(String(data.configuration.selectedSiteUrl));
    } catch {
      setResult({ ok: false, status: "request_failed", message: "Unable to run Google setup action." });
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
    const details = [candidate.url, candidate.matchStrength, candidate.matchReason].filter(Boolean).join(" - ");
    return details ? `${candidate.label} (${details})` : candidate.label;
  }

  function selectedCandidateWarning() {
    const selected = [
      ...ga4Candidates.filter((candidate) => (candidate.propertyId ?? candidate.id) === ga4PropertyId),
      ...gscCandidates.filter((candidate) => (candidate.siteUrl ?? candidate.id) === siteUrl),
      ...gbpCandidates.filter((candidate) => candidate.locationId === gbpLocationId)
    ].find((candidate) => !["exact_domain_match", "brand_match"].includes(candidate.matchStrength));
    return selected ? "This property does not appear to match Salty Cowhide. Only use it if you intentionally want to connect this workspace to that property." : "";
  }

  const warning = selectedCandidateWarning();

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
      <section className="sf-panel" style={{ display: "grid", gap: 12 }}>
        <div>
          <strong>Create Google setup for SaltyCowhide.com</strong>
          <p className="sf-muted">Use this when auto-detect finds other Google projects but no matching SaltyCowhide.com resources. Nothing is marked connected until a live sync or verification succeeds.</p>
        </div>
        <div className="sf-grid sf-grid-4">
          <div className="sf-panel" style={{ display: "grid", gap: 8 }}>
            <strong>Create GA4 setup</strong>
            <p className="sf-muted">Recommended. Creates a GA4 property and web stream for https://saltycowhide.com/ where Google Analytics edit permission allows it. Owner terms or account selection may be required.</p>
            <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected} title={googleConnected ? "Create GA4 setup for SaltyCowhide.com." : googleDisabledReason} onClick={() => googleSetupAction("ga4_create")}>Create GA4 setup for SaltyCowhide.com</button>
            <p className="sf-muted">Manual fallback: create a GA4 property in Google Analytics, add a web stream for https://saltycowhide.com/, then save the numeric property ID.</p>
          </div>
          <div className="sf-panel" style={{ display: "grid", gap: 8 }}>
            <strong>Add Search Console property</strong>
            <p className="sf-muted">Recommended. Adds https://saltycowhide.com/ and sc-domain:saltycowhide.com where Search Console write permission allows it. Ownership verification is still required.</p>
            <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected} title={googleConnected ? "Add SaltyCowhide.com to Search Console." : googleDisabledReason} onClick={() => googleSetupAction("search_console_add")}>Add SaltyCowhide.com to Search Console</button>
            <p className="sf-muted">Manual fallback: verify with DNS TXT, HTML file, meta tag, or Google Analytics verification if available.</p>
          </div>
          <div className="sf-panel" style={{ display: "grid", gap: 8 }}>
            <strong>Set up Merchant Center</strong>
            <p className="sf-muted">Important for ecommerce. Detects Merchant Center access and tracks business info, website claim, shipping, tax, product feed, and policy actions. It does not submit product feeds.</p>
            <button className="sf-button sf-button-secondary" disabled={busyProvider !== "" || !googleConnected} title={googleConnected ? "Set up Merchant Center for SaltyCowhide.com." : googleDisabledReason} onClick={() => googleSetupAction("merchant_center_setup")}>Set up Merchant Center for SaltyCowhide.com</button>
            <p className="sf-muted">Manual fallback: create Merchant Center, claim SaltyCowhide.com, complete shipping/tax, then return for feed readiness.</p>
          </div>
          <div className="sf-panel" style={{ display: "grid", gap: 8 }}>
            <strong>Google Business Profile eligibility check</strong>
            <p className="sf-muted">Optional for online-only POD. Only proceed if Salty Cowhide has an eligible local presence.</p>
            <label>Which best describes Salty Cowhide?<select value={gbpEligibility} onChange={(event) => setGbpEligibility(event.target.value)}>
              <option value="online_only_ecommerce_pod">Online-only ecommerce/POD</option>
              <option value="local_storefront">Local storefront</option>
              <option value="service_area_business">Service-area business</option>
              <option value="local_pickup_studio_showroom">Local pickup/studio/showroom</option>
              <option value="markets_popups_events">Markets/pop-ups/events</option>
            </select></label>
            <button className="sf-button sf-button-secondary" disabled={busyProvider !== ""} onClick={() => googleSetupAction("gbp_eligibility")}>Check Business Profile eligibility</button>
          </div>
        </div>
      </section>
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
      {warning ? <p className="sf-alert">{warning}</p> : null}
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
