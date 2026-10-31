import { Play, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getOrganizationWorkspace } from "@/lib/workspace";
import { RunReconciliationButton } from "./run-button";

export default async function RunReconciliationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { organization } = await getOrganizationWorkspace(organizationId);

  return (
    <div className="workspace-page">
      <Link
        className="back-link page-back"
        href={`/dashboard/${organizationId}/reconciliation`}
      >
        <ArrowLeft size={15} /> Back to reconciliation
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">RECONCILIATION</p>
          <h1>Start reconciliation run</h1>
          <p className="page-subtitle">
            Process unlinked source records and generate match suggestions for{" "}
            {organization.name}.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Run reconciliation</h2>
            <p className="panel-subtitle">
              This will normalize unprocessed records and create proposed
              matches
            </p>
          </div>
          <Play size={20} aria-hidden="true" />
        </div>
        <div className="panel-body">
          <RunReconciliationButton organizationId={organizationId} />
        </div>
      </section>
    </div>
  );
}
