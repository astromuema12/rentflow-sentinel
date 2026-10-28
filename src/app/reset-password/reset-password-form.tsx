"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.get("password"),
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Unable to reset your password.");
      } else {
        setMessage(result.message ?? "Password updated.");
      }
    } catch {
      setError("Unable to reset your password. Try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="auth-form">
      <label htmlFor="password">New password</label>
      <input
        autoComplete="new-password"
        id="password"
        maxLength={72}
        minLength={12}
        name="password"
        required
        type="password"
      />
      <p className="auth-hint">
        Use at least 12 characters and include a number.
      </p>
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
      <button
        className="auth-submit"
        disabled={pending || !token}
        type="submit"
      >
        {pending ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}
