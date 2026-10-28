import { ArrowRight, ArrowUpDown, Play } from "lucide-react";
import Link from "next/link";
import { MembershipRole, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  formatDate,
  formatMoney,
  getOrganizationWorkspace,
} from "@/lib/workspace";
import { MatchReviewActions } from "./review-actions";

const PAGE_SIZE = 30;
const filters = [
  { key: "all", label: "All transactions" },
  { key: "unmatched", label: "Unmatched" },
  { key: "matched", label: "Matched" },
  { key: "disputed", label: "Disputed" },
  { key: "unresolved", label: "Unresolved" },
] as const;
type FilterKey = (typeof filters)[number]["key"];

export default async function ReconciliationPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { organizationId } = await params;
  const query = await searchParams;
  const { organization, role } = await getOrganizationWorkspace(organizationId);
  const selectedFilter: FilterKey = filters.some(
    (item) => item.key === query.filter,
  )
    ? (query.filter as FilterKey)
    : "all";
  const parsedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const where: Prisma.NormalizedTransactionWhereInput = { organizationId };
  if (selectedFilter === "unmatched") where.status = "UNRECONCILED";
  if (selectedFilter === "matched")
    where.status = { in: ["MATCHED", "RECONCILED"] };
  if (selectedFilter === "disputed")
    where.proposedMatches = { some: { status: "REJECTED" } };
  if (selectedFilter === "unresolved")
    where.reconciliationExceptions = { some: { status: "OPEN" } };

  const prisma = getPrisma();
  const total = await prisma.normalizedTransaction.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const transactions = await prisma.normalizedTransaction.findMany({
    where,
    orderBy: [{ transactionDate: "desc" }, { id: "asc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      type: true,
      amount: true,
      currency: true,
      transactionDate: true,
      description: true,
      reference: true,
      payerPayee: true,
      status: true,
      proposedMatches: {
        where: {
          status: selectedFilter === "disputed" ? "REJECTED" : "PROPOSED",
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          candidateId: true,
          status: true,
          confidence: true,
          score: true,
          matchCriteria: true,
        },
      },
      _count: {
        select: { reconciliationExceptions: { where: { status: "OPEN" } } },
      },
    },
  });
  const candidateIds = [
    ...new Set(
      transactions.flatMap((transaction) =>
        transaction.proposedMatches.map((match) => match.candidateId),
      ),
    ),
  ];
  const candidates = candidateIds.length
    ? await prisma.importedSourceRecord.findMany({
        where: { organizationId, id: { in: candidateIds } },
        select: {
          id: true,
          amount: true,
          currency: true,
          transactionDate: true,
          description: true,
          reference: true,
          payerPayee: true,
        },
      })
    : [];
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );
  const mayReview = role !== MembershipRole.VIEWER;

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">TRANSACTION REVIEW</p>
          <h1>Reconciliation</h1>
          <p className="page-subtitle">
            Compare imported transactions and review suggested matches before
            confirming them.
          </p>
        </div>
        <Link
          className="button button-primary"
          href={`/dashboard/${organizationId}/reconciliation/run`}
        >
          <Play size={16} aria-hidden="true" /> Run reconciliation
        </Link>
      </header>
      <nav className="filter-tabs" aria-label="Filter transactions">
        {filters.map((filter) => (
          <Link
            aria-current={selectedFilter === filter.key ? "page" : undefined}
            className={
              selectedFilter === filter.key
                ? "filter-tab is-current"
                : "filter-tab"
            }
            href={`/dashboard/${organizationId}/reconciliation?filter=${filter.key}`}
            key={filter.key}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{organization.name}</p>
            <h2>Transactions</h2>
          </div>
          <span className="panel-subtitle">
            {total} {total === 1 ? "record" : "records"}
          </span>
        </div>
        {transactions.length ? (
          <div className="table-scroll">
            <table className="reconciliation-table">
              <thead>
                <tr>
                  <th>Date / details</th>
                  <th>Amount</th>
                  <th>Current status</th>
                  <th>Suggested match & evidence</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const match = transaction.proposedMatches[0];
                  const candidate = match
                    ? candidateById.get(match.candidateId)
                    : undefined;
                  return (
                    <tr key={transaction.id}>
                      <td>
                        <strong>
                          {transaction.payerPayee ||
                            transaction.description ||
                            "Transaction"}
                        </strong>
                        <small className="table-detail">
                          {formatDate(transaction.transactionDate)} ·{" "}
                          {transaction.reference || "No reference"}
                        </small>
                      </td>
                      <td>
                        <strong>
                          {transaction.type === "DEBIT" ? "−" : "+"}
                          {formatMoney(
                            transaction.amount.toString(),
                            transaction.currency,
                          )}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`status-pill status-${transaction.status.toLowerCase()}`}
                        >
                          {transaction.status.replaceAll("_", " ")}
                        </span>
                        {transaction._count.reconciliationExceptions ? (
                          <small className="table-detail">
                            {transaction._count.reconciliationExceptions} open
                            exception(s)
                          </small>
                        ) : null}
                      </td>
                      <td>
                        {match ? (
                          <div className="match-evidence">
                            <strong>
                              {candidate?.payerPayee ||
                                candidate?.description ||
                                "Candidate source row"}
                            </strong>
                            <span>
                              {candidate
                                ? `${formatDate(candidate.transactionDate)} · ${formatMoney(candidate.amount.toString(), candidate.currency)}`
                                : "Candidate source details unavailable"}
                            </span>
                            <span>
                              {match.confidence} confidence
                              {match.score
                                ? ` · score ${(Number(match.score) * 100).toFixed(0)}%`
                                : ""}
                            </span>
                            {match.matchCriteria ? (
                              <details>
                                <summary>Evidence details</summary>
                                <pre>
                                  {JSON.stringify(match.matchCriteria, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              <small>
                                No additional match criteria provided.
                              </small>
                            )}
                          </div>
                        ) : (
                          <span className="muted-note">No proposed match</span>
                        )}
                      </td>
                      <td>
                        {match ? (
                          match.status !== "PROPOSED" ? (
                            <span className="status-pill status-rejected">
                              Rejected · no action pending
                            </span>
                          ) : mayReview ? (
                            <MatchReviewActions
                              organizationId={organizationId}
                              matchId={match.id}
                            />
                          ) : (
                            <span className="muted-note">
                              Reviewer access required
                            </span>
                          )
                        ) : (
                          <Link
                            className="text-link"
                            href={`/dashboard/${organizationId}/exceptions`}
                          >
                            View exceptions <ArrowRight size={14} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <ArrowUpDown size={23} />
            <h3>No matching transactions</h3>
            <p>
              {total
                ? "Try another filter."
                : "Transaction records will appear here after imports and reconciliation runs are available."}
            </p>
          </div>
        )}
      </section>
      {pageCount > 1 ? (
        <nav className="pagination" aria-label="Transaction pages">
          <span>
            Page {safePage} of {pageCount}
          </span>
          {safePage > 1 ? (
            <Link href={`?filter=${selectedFilter}&page=${safePage - 1}`}>
              Previous
            </Link>
          ) : (
            <span aria-disabled="true">Previous</span>
          )}
          {safePage < pageCount ? (
            <Link href={`?filter=${selectedFilter}&page=${safePage + 1}`}>
              Next
            </Link>
          ) : (
            <span aria-disabled="true">Next</span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
