"use client";

import { useEffect, useState } from "react";

type Message = { id?: string; sender?: string; message_text?: string; messageText?: string; structured_payload?: Record<string, unknown> };
type Candidate = {
  id: string;
  title: string;
  concept_summary?: string;
  conceptSummary?: string;
  design_text?: string;
  designText?: string;
  preview_image_url?: string;
  previewImageUrl?: string;
  status?: string;
  risk_flags?: unknown[];
  riskFlags?: unknown[];
};

async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

export function CustomerDesignConcierge() {
  const [sessionId, setSessionId] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Ready for a safe custom design request.");
  const [purchaseUrl, setPurchaseUrl] = useState("");

  useEffect(() => {
    void postJson("/api/store/customer-design/session", { sourceRoute: "/store/custom" }).then((data) => {
      if (!data.ok) {
        setStatus("Custom design chat is temporarily unavailable.");
        return;
      }
      setSessionId(data.session.id);
      setSessionToken(data.sessionToken);
      setMessages([{ sender: "concierge", message_text: "Tell me what you want on the design. I can make a few safe custom ideas and keep it private for your purchase link." }]);
    });
  }, []);

  async function sendMessage() {
    const messageText = draft.trim();
    if (!messageText || !sessionId || !sessionToken) return;
    setDraft("");
    setMessages((items) => [...items, { sender: "customer", message_text: messageText }]);
    const data = await postJson("/api/store/customer-design/message", { sessionId, sessionToken, messageText });
    if (!data.ok) {
      setStatus("I could not save that request. Try again in a moment.");
      return;
    }
    setMessages((items) => [...items, data.output.conciergeMessage]);
    if (data.output.readyForCandidates) {
      setStatus("Generating safe candidate directions.");
      const generated = await postJson("/api/store/customer-design/candidates/generate", { sessionId, sessionToken });
      if (generated.ok) {
        setCandidates(generated.output.candidates ?? []);
        setStatus("Review the candidates and approve one to request a private purchase link.");
      } else {
        setStatus("Candidate generation is blocked until the request is safe and complete.");
      }
    }
  }

  async function approveCandidate(candidateId: string) {
    setPurchaseUrl("");
    const approved = await postJson(`/api/store/customer-design/candidates/${encodeURIComponent(candidateId)}/approve`, {
      sessionId,
      sessionToken,
      eventType: "approved_for_purchase_product"
    });
    if (!approved.ok) {
      setStatus("That candidate could not be approved for this session.");
      return;
    }
    const publish = await postJson("/api/store/customer-design/publish/request", { sessionId, sessionToken, candidateId });
    if (publish.ok && publish.output?.purchaseUrl) {
      setPurchaseUrl(publish.output.purchaseUrl);
      setStatus("Your private custom purchase link is ready.");
    } else {
      setStatus("Purchase-link creation is pending or blocked until owner-controlled Shopify creation flags and safety checks pass.");
    }
  }

  return (
    <section className="concierge-shell" aria-label="Customer Design Concierge">
      <div className="concierge-header">
        <div>
          <p className="eyebrow">AI Customer Design Concierge</p>
          <h2>Make a private custom purchase request</h2>
        </div>
        <span>Human-safe gates required</span>
      </div>
      <div className="concierge-messages">
        {messages.map((message, index) => (
          <div className={`concierge-message ${message.sender === "customer" ? "is-customer" : ""}`} key={`${message.id ?? index}`}>
            {String(message.message_text ?? message.messageText ?? "")}
          </div>
        ))}
      </div>
      <div className="concierge-input-row">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }}
          placeholder="Example: funny redfish shirt for a Tampa Bay fishing trip"
        />
        <button className="store-button store-button-primary" type="button" onClick={() => void sendMessage()}>Send</button>
      </div>
      {candidates.length ? (
        <div className="candidate-grid">
          {candidates.map((candidate) => {
            const blocked = candidate.status === "blocked";
            return (
              <article className="candidate-card" key={candidate.id}>
                {candidate.preview_image_url || candidate.previewImageUrl ? <img src={String(candidate.preview_image_url ?? candidate.previewImageUrl)} alt="" /> : <div className="candidate-preview">{blocked ? "Blocked" : "Preview pending"}</div>}
                <strong>{candidate.title}</strong>
                <p>{String(candidate.concept_summary ?? candidate.conceptSummary ?? "")}</p>
                {candidate.design_text || candidate.designText ? <span>{String(candidate.design_text ?? candidate.designText)}</span> : null}
                <small>{blocked ? "Policy/IP blocked" : "Safe candidate direction"}</small>
                <button className="store-button store-button-secondary" disabled={blocked} type="button" onClick={() => void approveCandidate(candidate.id)}>Approve for private purchase link</button>
              </article>
            );
          })}
        </div>
      ) : null}
      {purchaseUrl ? <a className="store-button store-button-primary" href={purchaseUrl}>Open private purchase link</a> : null}
      <p className="concierge-status">{status}</p>
    </section>
  );
}
