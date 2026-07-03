"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type SetupField = {
  name: string;
  label: string;
  type?: "text" | "password" | "hidden";
  placeholder?: string;
  helper?: string;
  value?: string;
};

type SetupResult = {
  ok?: boolean;
  status?: string;
  safeMessage?: string;
  setupRequired?: string[];
  nextStep?: string | null;
  maskedDisplayValue?: string | null;
  providerMetadata?: Record<string, unknown>;
};

function metadataList(value: unknown, key: string) {
  if (!Array.isArray(value) || !value.length) return null;
  const rows = value
    .map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
    .filter((item): item is Record<string, unknown> => Boolean(item?.id));
  if (!rows.length) return null;
  return <div className="setup-metadata-list">
    <span>{key}</span>
    <ul>
      {rows.slice(0, 12).map((item) => <li key={String(item.id)}>
        <strong>{String(item.title ?? item.name ?? item.id)}</strong>
        <code>{String(item.id)}</code>
      </li>)}
    </ul>
  </div>;
}

export function SetupApiForm({
  title,
  description,
  action,
  submitLabel,
  fields = []
}: {
  title: string;
  description?: string;
  action: string;
  submitLabel: string;
  fields?: SetupField[];
}) {
  const [result, setResult] = useState<SetupResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(action, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await response.json().catch(() => ({}));
      setResult(json);
    } catch {
      setResult({
        ok: false,
        status: "error",
        safeMessage: "Validation could not be completed. Check your connection and try again.",
        setupRequired: ["Try again or request setup help"]
      });
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={onSubmit}>
    <h3>{title}</h3>
    {description ? <p>{description}</p> : null}
    {fields.map((field) => field.type === "hidden"
      ? <input key={field.name} type="hidden" name={field.name} value={field.value ?? ""} />
      : <label key={field.name}>
        <span>{field.label}</span>
        <input
          name={field.name}
          type={field.type ?? "text"}
          placeholder={field.placeholder}
          autoComplete={field.type === "password" ? "off" : undefined}
          defaultValue={field.value}
        />
        {field.helper ? <small>{field.helper}</small> : null}
      </label>)}
    <button className="btn btn-primary" type="submit" disabled={submitting} title={submitting ? "Validation is running server-side" : undefined}>
      {submitting ? "Validating..." : submitLabel}
    </button>
    {result ? <section className={result.ok ? "setup-validation-result is-success" : "setup-validation-result is-blocked"} role={result.ok ? "status" : "alert"}>
      <strong>{String(result.status ?? (result.ok ? "connected" : "blocked")).replace(/_/g, " ")}</strong>
      <p>{result.safeMessage ?? "No validation message returned."}</p>
      {result.maskedDisplayValue ? <p><span>Credential:</span> {result.maskedDisplayValue}</p> : null}
      {result.nextStep ? <p><span>Next step:</span> {result.nextStep}</p> : null}
      {metadataList(result.providerMetadata?.collections, "Collections returned")}
      {metadataList(result.providerMetadata?.shops, "Shops returned")}
      {result.setupRequired?.length ? <ul>{result.setupRequired.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    </section> : null}
  </form>;
}
