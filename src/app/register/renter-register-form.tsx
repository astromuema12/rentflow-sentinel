"use client";

import Link from "next/link";
import { useState } from "react";

export function RenterRegisterForm() {
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [pending, setPending] = useState(false);

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
      setCreated(true);
    } catch {
      setError("Your account could not be created. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className="registration-success" role="status">
        <h2>You’re ready to start looking.</h2>
        <p>Your renter account is set up. Sign in to browse available homes.</p>
        <Link className="auth-submit" href="/sign-in">
          Go to sign in
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
      <label htmlFor="password">Password</label>
      <input
        autoComplete="new-password"
        id="password"
        minLength={10}
        name="password"
        required
        type="password"
      />
      <p className="auth-hint">Use at least 10 characters.</p>
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
