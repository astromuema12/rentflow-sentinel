"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

type ReconciliationResult = {
  runId: string;
  processed: number;
  suggestedMatches: number;
};

export function RunReconciliationButton({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/reconciliation/run`,
        {
          method: "POST",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to run reconciliation");
      }

      const data = (await res.json()) as ReconciliationResult;
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run reconciliation",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleRun}
        className="button button-primary"
        disabled={running}
      >
        <Play size={16} aria-hidden="true" />
        {running ? "Running reconciliation..." : "Start reconciliation run"}
      </button>
      {error && <p className="error-message">{error}</p>}
      {result && (
        <div className="result-message">
          <p>
            <strong>Reconciliation complete</strong>
          </p>
          <p>Processed: {result.processed} records</p>
          <p>Match suggestions generated</p>
        </div>
      )}
    </div>
  );
}
