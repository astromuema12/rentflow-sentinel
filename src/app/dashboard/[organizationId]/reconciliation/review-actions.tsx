"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MatchReviewActions({
  organizationId,
  matchId,
}: {
  organizationId: string;
  matchId: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(decision: "ACCEPT" | "REJECT") {
    setError("");
    if (decision === "REJECT" && reason.trim().length < 5) {
      setError("Enter a reason of at least 5 characters.");
      return;
    }
    if (
      decision === "ACCEPT" &&
      !window.confirm(
        "Accept this proposed match? The transaction will be marked matched.",
      )
    )
      return;
    setPending(true);
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/matches/${matchId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            reason: reason.trim() || undefined,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || "Review could not be saved.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Review could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="review-actions">
      <label className="sr-only" htmlFor={`reason-${matchId}`}>
        Reason if rejecting this match
      </label>
      <input
        id={`reason-${matchId}`}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason to reject (required)"
      />
      <div className="review-buttons">
        <button
          className="button button-primary button-small"
          disabled={pending}
          onClick={() => void submit("ACCEPT")}
          type="button"
        >
          Accept
        </button>
        <button
          className="button button-danger button-small"
          disabled={pending}
          onClick={() => void submit("REJECT")}
          type="button"
        >
          Reject
        </button>
      </div>
      {error ? (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="sr-only" role="status">
          Saving review…
        </p>
      ) : null}
    </div>
  );
}
