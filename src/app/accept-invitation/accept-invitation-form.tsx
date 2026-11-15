"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function AcceptInvitationForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setError("");
    if (formData.get("password") !== formData.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(
        "/api/auth/organization-invitations/accept",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            password: formData.get("password"),
          }),
        },
      );
      const result = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "The invitation could not be accepted.");
        return;
      }

      setCreated(true);
    } catch {
      setError("The invitation could not be accepted. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className="registration-success" role="status">
        <h2>You’re ready to manage your portfolio.</h2>
        <p>Your landlord account is set up. Sign in to continue.</p>
        <Link className="auth-submit" href="/sign-in">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <p className="auth-error" role="alert">
        This invitation link is missing its token. Ask the platform
        administrator to send a new invitation.
      </p>
    );
  }

  return (
    <form action={submit} className="auth-form">
      <label htmlFor="password">Create password</label>
      <input
        autoComplete="new-password"
        id="password"
        maxLength={72}
        minLength={12}
        name="password"
        required
        type="password"
      />
      <label htmlFor="confirmPassword">Confirm password</label>
      <input
        autoComplete="new-password"
        id="confirmPassword"
        maxLength={72}
        minLength={12}
        name="confirmPassword"
        required
        type="password"
      />
      <p className="auth-hint">
        Use at least 12 characters and include a number.
      </p>
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending ? "Setting up account..." : "Accept invitation"}
      </button>
    </form>
  );
}
