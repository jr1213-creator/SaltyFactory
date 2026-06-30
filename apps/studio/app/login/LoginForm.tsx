"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

const messages: Record<string, string> = {
  supabase_auth_not_configured: "Studio login is not configured. Ask an administrator to set Supabase Auth URL and anon key.",
  not_authorized: "That email is not authorized for Studio access.",
  forbidden: "Studio access was denied.",
  method_not_allowed: "Use the login form to access Studio.",
  callback_failed: "That sign-in link is invalid or expired. Request a new secure link."
};

export default function LoginForm({ initialError = "" }: { initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError ? messages[initialError] || "Studio login failed." : "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/studio/login", {
        method: "POST",
        body: new FormData(event.currentTarget),
        headers: { Accept: "application/json" }
      });
      const payload = await response.json().catch(() => ({ ok: false, error: "forbidden" }));
      if (response.ok && payload.ok) {
        setMessage("Check your email for your secure sign-in link.");
        return;
      }
      setError(messages[String(payload.error)] || "Studio login failed.");
    } catch {
      setError("Studio login failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="email" type="email" placeholder="admin@saltycowhide.com" autoComplete="email" required />
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending link..." : "Send secure link"}</button>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
