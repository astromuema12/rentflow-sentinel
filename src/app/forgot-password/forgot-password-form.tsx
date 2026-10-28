"use client";

import { useState } from "react";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") }),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Unable to request a password reset.");
      } else {
        setMessage(result.message ?? "Request received.");
      }
    } catch {
      setError("Unable to request a password reset. Try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="auth-form">
      <label htmlFor="email">Email address</label>
      <input
        autoComplete="email"
        id="email"
        maxLength={254}
        name="email"
        required
        type="email"
      />
      {message ? (
        <p className="auth-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
