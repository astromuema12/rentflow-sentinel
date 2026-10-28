import {
  ArrowRight,
  Building2,
  CircleAlert,
  CircleDollarSign,
  FileClock,
  FileSpreadsheet,
  Play,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import {
  formatDate,
  formatMoney,
  getOrganizationWorkspace,
} from "@/lib/workspace";

export default async function OrganizationDashboard({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { organization } = await getOrganizationWorkspace(organizationId);
  const prisma = getPrisma();
  const [
    batchCount,
    transactionCount,
    openExceptionCount,
    latestBatches,
    latestRun,
    credits,
    debits,
  ] = await Promise.all([
    prisma.importBatch.count({ where: { organizationId } }),
    prisma.normalizedTransaction.count({ where: { organizationId } }),
    prisma.reconciliationException.count({
      where: { organizationId, status: "OPEN" },
    }),
    prisma.importBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, filename: true, status: true, createdAt: true },
    }),
    prisma.reconciliationRun.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true },
    }),
    prisma.normalizedTransaction.aggregate({
      where: { organizationId, type: "CREDIT" },
      _sum: { amount: true },
    }),
    prisma.normalizedTransaction.aggregate({
      where: { organizationId, type: "DEBIT" },
      _sum: { amount: true },
    }),
  ]);

  const received = credits._sum.amount?.toString() ?? "0";
  const paid = debits._sum.amount?.toString() ?? "0";
  const hasActivity = batchCount > 0 || transactionCount > 0;

  const summaryCards = [
    {
      label: "Incoming funds",
      value: formatMoney(received, organization.currency),
      detail: "Total imported credit transactions",
      icon: CircleDollarSign,
      tone: "primary",
    },
    {
      label: "Operating outflows",
      value: formatMoney(paid, organization.currency),
      detail: "Total imported debit transactions",
      icon: Wallet,
      tone: "neutral",
    },
    {
      label: "Import batches",
      value: String(batchCount),
      detail: "Statements and ledgers received",
      icon: Building2,
      tone: "success",
    },
    {
      label: "Transactions on file",
      value: String(transactionCount),
      detail:
        openExceptionCount > 0
          ? `${openExceptionCount} exceptions need attention`
          : "No open reconciliation issues",
      icon: openExceptionCount > 0 ? CircleAlert : TrendingUp,
      tone: openExceptionCount > 0 ? "warning" : "success",
    },
  ];

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PORTFOLIO OVERVIEW</p>
          <h1>{organization.name}</h1>
          <p className="page-subtitle">
            Cashflow visibility, import activity, and reconciliation health for
            your rental operations.
          </p>
        </div>
        <div className="page-actions">
          <Link
            className="button button-secondary"
            href={`/dashboard/${organizationId}/imports/upload`}
          >
            <Upload size={16} aria-hidden="true" /> Upload CSV
          </Link>
          <Link
            className="button button-primary"
            href={`/dashboard/${organizationId}/reconciliation/run`}
          >
            <Play size={16} aria-hidden="true" /> Run reconciliation
          </Link>
        </div>
      </header>

      <section className="summary-grid" aria-label="Organization activity">
        {summaryCards.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className={`summary-card summary-card--${tone}`}>
            <div className="summary-card__header">
              <span>{label}</span>
              <span className="summary-card__icon" aria-hidden="true">
                <Icon size={15} />
              </span>
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      {openExceptionCount > 0 ? (
        <Link
          className="attention-banner"
          href={`/dashboard/${organizationId}/exceptions`}
        >
          <CircleAlert size={19} aria-hidden="true" />
          <span>
            <strong>
              {openExceptionCount} unresolved{" "}
              {openExceptionCount === 1 ? "exception" : "exceptions"}
            </strong>{" "}
            need review.
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      ) : null}

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">RECENT ACTIVITY</p>
              <h2>Import history</h2>
            </div>
            <Link
              className="text-link"
              href={`/dashboard/${organizationId}/imports`}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {latestBatches.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Status</th>
                    <th>Imported</th>
                    <th>
                      <span className="sr-only">Open batch</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {latestBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <Link
                          className="table-link"
                          href={`/dashboard/${organizationId}/imports/${batch.id}`}
                        >
                          {batch.filename}
                        </Link>
                      </td>
                      <td>
                        <span
                          className={`status-pill status-${batch.status.toLowerCase()}`}
                        >
                          {batch.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>{formatDate(batch.createdAt)}</td>
                      <td>
                        <Link
                          className="icon-link"
                          aria-label={`Inspect ${batch.filename}`}
                          href={`/dashboard/${organizationId}/imports/${batch.id}`}
                        >
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <FileSpreadsheet size={22} aria-hidden="true" />
              <h3>No imports yet</h3>
              <p>
                Import history will appear here once a batch has been added.
              </p>
              <p className="muted-note">
                Upload a CSV export from your bank or property ledger to get
                started.
              </p>
            </div>
          )}
        </section>
        <aside className="panel next-actions">
          <p className="eyebrow">WORK QUEUE</p>
          <h2>Next actions</h2>
          {openExceptionCount > 0 ? (
            <Link
              className="action-row"
              href={`/dashboard/${organizationId}/exceptions`}
            >
              <CircleAlert size={18} />
              <span>
                <strong>Review open exceptions</strong>
                <small>{openExceptionCount} awaiting review</small>
              </span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <p className="quiet-state">
              No unresolved exceptions. New items will appear here when
              available.
            </p>
          )}
          <Link
            className="action-row"
            href={`/dashboard/${organizationId}/reconciliation`}
          >
            <ArrowRight size={18} />
            <span>
              <strong>Open reconciliation</strong>
              <small>Review transactions and proposed matches</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <div className="latest-run">
            <span className="workspace-label">LATEST RECONCILIATION</span>
            {latestRun ? (
              <p>
                {latestRun.status} · {formatDate(latestRun.createdAt)}
              </p>
            ) : (
              <p>
                <FileClock size={15} /> No reconciliation runs recorded
              </p>
            )}
          </div>
        </aside>
      </div>
      {!hasActivity ? (
        <p className="footnote">
          Your portfolio is ready. Upload a CSV statement to see incoming funds,
          outflows, and items that need review here.
        </p>
      ) : null}
    </div>
  );
}
