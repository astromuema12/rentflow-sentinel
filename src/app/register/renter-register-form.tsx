"use client";

import Link from "next/link";
import { useState } from "react";

export function RenterRegisterForm() {
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [pending, setPending] = useState(false);
  const [registeredDetails, setRegisteredDetails] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/renter-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Your account could not be created.");
        return;
      }
      setRegisteredDetails({
        firstName: String(formData.get("firstName")),
        lastName: String(formData.get("lastName")),
        email: String(formData.get("email")).trim().toLowerCase(),
      });
      setCreated(true);
    } catch {
      setError("The verification request failed. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  async function resendVerification() {
    if (!registeredDetails) return;

    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/renter-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registeredDetails),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The verification email could not be sent.");
      }
    } catch {
      setError(
        "The verification email could not be sent. Check your connection.",
      );
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className="registration-success">
        <h2>Check your inbox</h2>
        <p role="status">
          If the address can be registered, we sent a link to verify it and
          choose a password. The link expires after 24 hours.
        </p>
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="auth-submit"
          disabled={pending}
          onClick={resendVerification}
          type="button"
        >
          {pending ? "Sending..." : "Resend verification email"}
        </button>
        <Link className="auth-submit" href="/sign-in">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="firstName">First name</label>
      <input id="firstName" name="firstName" maxLength={80} required />
      <label htmlFor="lastName">Last name</label>
      <input id="lastName" name="lastName" maxLength={80} required />
      <label htmlFor="email">Email address</label>
      <input
        autoComplete="email"
        id="email"
        name="email"
        required
        type="email"
      />
      <p className="auth-hint">
        We’ll email a one-time link so you can verify your address and create a
        password.
      </p>
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending ? "Creating account…" : "Create renter account"}
      </button>
    </form>
  );
}
