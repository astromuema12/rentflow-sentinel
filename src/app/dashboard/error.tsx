"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard request failed.", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <main className="dashboard-error" role="alert">
      <p className="eyebrow">WORKSPACE UNAVAILABLE</p>
      <h1>We couldn’t load this workspace</h1>
      <p>
        Your data has not been changed. Check your connection and try again. If
        this continues, contact your administrator.
      </p>
      <button
        className="button button-primary"
        onClick={() => retry()}
        type="button"
      >
        Try again
      </button>
    </main>
  );
}
