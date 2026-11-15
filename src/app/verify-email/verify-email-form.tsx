"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
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
        "/api/auth/renter-email-verification/confirm",
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
        setError(result.error ?? "Email verification could not be completed.");
        return;
      }

      setVerified(true);
    } catch {
      setError("Email verification failed. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  if (verified) {
    return (
      <div className="registration-success">
        <h2>Email verified</h2>
        <p>You can now sign in and continue your rental search.</p>
        <Link className="auth-submit" href="/sign-in">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <p className="auth-error" role="alert">
        This verification link is missing its token. Request another link from
        the registration page.
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
        {pending ? "Verifying..." : "Verify email"}
      </button>
    </form>
  );
}
