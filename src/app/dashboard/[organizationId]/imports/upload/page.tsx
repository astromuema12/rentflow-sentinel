import { Upload, FileSpreadsheet } from "lucide-react";
import { getOrganizationWorkspace } from "@/lib/workspace";
import { UploadForm } from "./upload-form";

export default async function ImportUploadPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { organization } = await getOrganizationWorkspace(organizationId);

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">DATA INTAKE</p>
          <h1>Upload statement</h1>
          <p className="page-subtitle">
            Import a CSV file to create transactions for {organization.name}.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>CSV Import</h2>
            <p className="panel-subtitle">
              Upload rent ledger or bank/M-Pesa statements
            </p>
          </div>
          <FileSpreadsheet size={20} aria-hidden="true" />
        </div>
        <div className="panel-body">
          <p className="muted-note">
            Expected columns (flexible): Date, Amount, Description/Details,
            Reference, Payer/Payee, Type (CREDIT/DEBIT). Currency defaults to{" "}
            {organization.currency}.
          </p>
          <UploadForm organizationId={organizationId} />
        </div>
      </section>
    </div>
  );
}
