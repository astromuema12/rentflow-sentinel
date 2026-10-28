"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExceptionReviewActions({
  organizationId,
  exceptionId,
}: {
  organizationId: string;
  exceptionId: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(status: "RESOLVED" | "IGNORED") {
    setError("");
    if (reason.trim().length < 5) {
      setError("Enter a review note of at least 5 characters.");
      return;
    }
    if (
      status === "IGNORED" &&
      !window.confirm(
        "Ignore this exception? The decision will be recorded in the audit history.",
      )
    )
      return;
    setPending(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/exceptions/${exceptionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reason: reason.trim() }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "Exception review could not be saved.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Exception review could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="exception-review-form"
      onSubmit={(event) => event.preventDefault()}
    >
      <label htmlFor={`exception-note-${exceptionId}`}>
        Review note <span>(required)</span>
      </label>
      <textarea
        id={`exception-note-${exceptionId}`}
        maxLength={1000}
        minLength={5}
        onChange={(event) => setReason(event.target.value)}
        required
        value={reason}
      />
      <div className="review-buttons">
        <button
          className="button button-primary button-small"
          disabled={pending}
          onClick={() => void submit("RESOLVED")}
          type="button"
        >
          Resolve
        </button>
        <button
          className="button button-danger button-small"
          disabled={pending}
          onClick={() => void submit("IGNORED")}
          type="button"
        >
          Ignore exception
        </button>
      </div>
      {error ? (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="sr-only" role="status">
          Saving exception review…
        </p>
      ) : null}
    </form>
  );
}
