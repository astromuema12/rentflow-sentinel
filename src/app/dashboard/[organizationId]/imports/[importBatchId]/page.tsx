import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MembershipRole } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  formatDate,
  formatMoney,
  getOrganizationWorkspace,
} from "@/lib/workspace";

const PAGE_SIZE = 50;

export default async function ImportBatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string; importBatchId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { organizationId, importBatchId } = await params;
  const { page: pageValue } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageValue ?? "1", 10) || 1);
  const { organization } = await getOrganizationWorkspace(
    organizationId,
    MembershipRole.VIEWER,
  );
  const prisma = getPrisma();
  const batch = await prisma.importBatch.findFirst({
    where: { id: importBatchId, organizationId },
    select: {
      id: true,
      filename: true,
      sourceType: true,
      status: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      metadata: true,
      _count: { select: { importedRecords: true } },
    },
  });
  if (!batch) notFound();

  const pageCount = Math.max(
    1,
    Math.ceil(batch._count.importedRecords / PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount);
  const records = await prisma.importedSourceRecord.findMany({
    where: { importBatchId, organizationId },
    orderBy: [{ transactionDate: "desc" }, { id: "asc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      transactionDate: true,
      amount: true,
      currency: true,
      description: true,
      reference: true,
      payerPayee: true,
      processed: true,
    },
  });
  const metadata =
    batch.metadata &&
    typeof batch.metadata === "object" &&
    !Array.isArray(batch.metadata)
      ? (batch.metadata as Record<string, unknown>)
      : {};
  const errors = Array.isArray(metadata.validationErrors)
    ? metadata.validationErrors
    : [];
  return (
    <div className="workspace-page">
      <Link
        className="back-link page-back"
        href={`/dashboard/${organizationId}/imports`}
      >
        <ArrowLeft size={15} /> Import history
      </Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">IMPORT BATCH</p>
          <h1>{batch.filename}</h1>
          <p className="page-subtitle">
            {batch.sourceType.replaceAll("_", " ")} · Added{" "}
            {formatDate(batch.createdAt)}
          </p>
        </div>
        <span className={`status-pill status-${batch.status.toLowerCase()}`}>
          {batch.status.replaceAll("_", " ")}
        </span>
      </header>
      <section className="summary-grid summary-grid-three">
        <article className="summary-card">
          <span>Source records</span>
          <strong>{batch._count.importedRecords}</strong>
        </article>
        <article className="summary-card">
          <span>Processing started</span>
          <strong className="summary-date">
            {batch.startedAt ? formatDate(batch.startedAt) : "Not started"}
          </strong>
        </article>
        <article className="summary-card">
          <span>Completed</span>
          <strong className="summary-date">
            {batch.completedAt
              ? formatDate(batch.completedAt)
              : "Not completed"}
          </strong>
        </article>
      </section>
      {errors.length ? (
        <section className="panel validation-panel">
          <h2>Validation issues</h2>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>
                {typeof error === "string" ? error : JSON.stringify(error)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SOURCE RECORDS</p>
            <h2>Imported rows</h2>
          </div>
          <span className="panel-subtitle">
            {organization.currency} · {batch._count.importedRecords} records
          </span>
        </div>
        {records.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Party / description</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Processing</th>
                  <th>
                    <span className="sr-only">Source data</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.transactionDate)}</td>
                    <td>
                      <strong>{record.payerPayee || "—"}</strong>
                      <small className="table-detail">
                        {record.description || "No description"}
                      </small>
                    </td>
                    <td>{record.reference || "—"}</td>
                    <td>
                      {formatMoney(record.amount.toString(), record.currency)}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${record.processed ? "status-completed" : "status-pending"}`}
                      >
                        {record.processed ? "Processed" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/api/organizations/${organizationId}/imports/${batch.id}/records/${record.id}`}
                      >
                        Source JSON <FileSpreadsheet size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="quiet-state">This batch has no source records.</p>
        )}
      </section>
      {pageCount > 1 ? (
        <nav className="pagination" aria-label="Source record pages">
          <span>
            Page {safePage} of {pageCount}
          </span>
          {safePage > 1 ? (
            <Link href={`?page=${safePage - 1}`}>Previous</Link>
          ) : (
            <span aria-disabled="true">Previous</span>
          )}
          {safePage < pageCount ? (
            <Link href={`?page=${safePage + 1}`}>Next</Link>
          ) : (
            <span aria-disabled="true">Next</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
