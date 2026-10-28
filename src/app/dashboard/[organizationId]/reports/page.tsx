import { Download, FileBarChart } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { formatMoney, getOrganizationWorkspace } from "@/lib/workspace";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const { organization } = await getOrganizationWorkspace(organizationId);
  const prisma = getPrisma();
  const [transactions, exceptions] = await Promise.all([
    prisma.normalizedTransaction.groupBy({
      by: ["status", "type"],
      where: { organizationId },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.reconciliationException.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
  ]);
  const totalTransactions = transactions.reduce(
    (sum, group) => sum + group._count._all,
    0,
  );
  const openExceptions =
    exceptions.find((group) => group.status === "OPEN")?._count._all ?? 0;

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">FINANCIAL SUMMARY</p>
          <h1>Reports</h1>
          <p className="page-subtitle">
            A preview of imported transaction records and outstanding review
            items.
          </p>
        </div>
        <a
          className="button button-primary"
          href={`/api/organizations/${organizationId}/exports`}
        >
          <Download size={16} aria-hidden="true" /> Export transactions (CSV)
        </a>
      </header>
      <section className="report-callout">
        <FileBarChart size={20} aria-hidden="true" />
        <p>
          Report totals below use current transaction records only. Proposed
          matches are not treated as confirmed until reviewed.
        </p>
      </section>
      <section
        className="summary-grid summary-grid-three"
        aria-label="Report totals"
      >
        <article className="summary-card">
          <span>Transaction records</span>
          <strong>{totalTransactions}</strong>
        </article>
        <article className="summary-card">
          <span>Confirmed matched records</span>
          <strong>
            {transactions
              .filter(
                (group) =>
                  group.status === "MATCHED" || group.status === "RECONCILED",
              )
              .reduce((sum, group) => sum + group._count._all, 0)}
          </strong>
        </article>
        <article className="summary-card">
          <span>Unresolved exceptions</span>
          <strong>{openExceptions}</strong>
        </article>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REPORT PREVIEW</p>
            <h2>Transactions by status</h2>
          </div>
          <span className="panel-subtitle">{organization.currency}</span>
        </div>
        {transactions.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Transaction type</th>
                  <th>Records</th>
                  <th>Recorded total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((group) => (
                  <tr key={`${group.status}-${group.type}`}>
                    <td>
                      <span
                        className={`status-pill status-${group.status.toLowerCase()}`}
                      >
                        {group.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      {group.type === "CREDIT"
                        ? "Credits received"
                        : "Debits paid"}
                    </td>
                    <td>{group._count._all}</td>
                    <td>
                      {formatMoney(
                        group._sum.amount?.toString() ?? "0",
                        organization.currency,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FileBarChart size={24} />
            <h3>No report data yet</h3>
            <p>
              When this organization has transaction records, this report will
              summarize them without treating suggestions as confirmed matches.
            </p>
          </div>
        )}
      </section>
      <section className="panel report-exceptions">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REVIEW STATUS</p>
            <h2>Exceptions</h2>
          </div>
        </div>
        {exceptions.length ? (
          <ul className="report-status-list">
            {exceptions.map((group) => (
              <li key={group.status}>
                <span
                  className={`status-pill status-${group.status.toLowerCase()}`}
                >
                  {group.status}
                </span>
                <strong>{group._count._all}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-state">
            No exception records have been recorded.
          </p>
        )}
      </section>
      <p className="footnote">
        Export contains transaction records scoped to this organization. CSV is
        the currently supported report format.
      </p>
    </div>
  );
}
