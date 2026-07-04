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

type QuickAction = {
  label: string;
  values: Record<string, string>;
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

function recommendedModelList(value: unknown) {
  if (!Array.isArray(value) || !value.length) return null;
  const rows = value
    .map((item) => item && typeof item === "object" ? item as Record<string, unknown> : null)
    .filter((item): item is Record<string, unknown> => Boolean(item?.model));
  if (!rows.length) return null;
  return <div className="setup-metadata-list">
    <span>Recommended models</span>
    <ul>
      {rows.slice(0, 6).map((item) => <li key={String(item.model)}>
        <strong>{String(item.label ?? item.model)}</strong>
        <code>{String(item.model)}</code>
      </li>)}
    </ul>
  </div>;
}

export function SetupApiForm({
  title,
  description,
  action,
  submitLabel,
  fields = [],
  quickActions = []
}: {
  title: string;
  description?: string;
  action: string;
  submitLabel: string;
  fields?: SetupField[];
  quickActions?: QuickAction[];
}) {
  const [result, setResult] = useState<SetupResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.name, field.value ?? ""])));

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
      ? <input key={field.name} type="hidden" name={field.name} value={values[field.name] ?? field.value ?? ""} />
      : <label key={field.name}>
        <span>{field.label}</span>
        <input
          name={field.name}
          type={field.type ?? "text"}
          placeholder={field.placeholder}
          autoComplete={field.type === "password" ? "off" : undefined}
          value={values[field.name] ?? ""}
          onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
        />
        {field.helper ? <small>{field.helper}</small> : null}
      </label>)}
    {quickActions.length ? <div className="setup-form-actions">
      {quickActions.map((item) => <button
        key={item.label}
        className="btn btn-secondary"
        type="button"
        onClick={() => setValues((current) => ({ ...current, ...item.values }))}
      >
        {item.label}
      </button>)}
    </div> : null}
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
      {recommendedModelList(result.providerMetadata?.recommendedModels)}
      {result.setupRequired?.length ? <ul>{result.setupRequired.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    </section> : null}
  </form>;
}
