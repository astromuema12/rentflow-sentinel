import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { MembershipRole } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  formatDate,
  formatMoney,
  getOrganizationWorkspace,
} from "@/lib/workspace";
import { ExceptionReviewActions } from "./review-actions";

export default async function ExceptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { organizationId } = await params;
  const query = await searchParams;
  const selectedStatus = ["OPEN", "RESOLVED", "IGNORED"].includes(
    query.status ?? "",
  )
    ? (query.status as "OPEN" | "RESOLVED" | "IGNORED")
    : "OPEN";
  const { organization, role } = await getOrganizationWorkspace(organizationId);
  const prisma = getPrisma();
  const exceptions = await prisma.reconciliationException.findMany({
    where: { organizationId, status: selectedStatus },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      exceptionType: true,
      status: true,
      details: true,
      resolutionNotes: true,
      createdAt: true,
      normalizedTransaction: {
        select: {
          id: true,
          amount: true,
          currency: true,
          transactionDate: true,
          description: true,
          reference: true,
          payerPayee: true,
          reviewDecisions: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              decisionType: true,
              rationale: true,
              createdAt: true,
              reviewedBy: { select: { email: true } },
            },
          },
        },
      },
    },
  });
  const auditEvents = exceptions.length
    ? await prisma.auditEvent.findMany({
        where: {
          organizationId,
          entityType: "ReconciliationException",
          entityId: { in: exceptions.map((exception) => exception.id) },
        },
        orderBy: { occurredAt: "desc" },
        select: {
          entityId: true,
          action: true,
          occurredAt: true,
          metadata: true,
          actor: { select: { email: true } },
        },
      })
    : [];
  const auditByException = new Map<string, typeof auditEvents>();
  for (const audit of auditEvents) {
    if (!audit.entityId) continue;
    const history = auditByException.get(audit.entityId) ?? [];
    history.push(audit);
    auditByException.set(audit.entityId, history);
  }
  const mayReview = role !== MembershipRole.VIEWER;

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ISSUES FOR REVIEW</p>
          <h1>Exceptions</h1>
          <p className="page-subtitle">
            Investigate discrepancies for {organization.name} and keep a clear
            record of each decision.
          </p>
        </div>
      </header>
      <nav className="filter-tabs" aria-label="Filter exceptions">
        {(["OPEN", "RESOLVED", "IGNORED"] as const).map((status) => (
          <Link
            aria-current={selectedStatus === status ? "page" : undefined}
            className={
              selectedStatus === status ? "filter-tab is-current" : "filter-tab"
            }
            href={`/dashboard/${organizationId}/exceptions?status=${status}`}
            key={status}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </Link>
        ))}
      </nav>
      {exceptions.length ? (
        <div className="exception-list">
          {exceptions.map((exception) => {
            const transaction = exception.normalizedTransaction;
            return (
              <article className="panel exception-card" key={exception.id}>
                <header className="exception-heading">
                  <span
                    className={`status-pill status-${exception.status.toLowerCase()}`}
                  >
                    {exception.status}
                  </span>
                  <span className="exception-kind">
                    {exception.exceptionType.replaceAll("_", " ")}
                  </span>
                  <time>{formatDate(exception.createdAt)}</time>
                </header>
                <div className="exception-details">
                  <div>
                    <span className="workspace-label">SOURCE TRANSACTION</span>
                    <strong>
                      {transaction.payerPayee ||
                        transaction.description ||
                        "Transaction"}
                    </strong>
                    <small>
                      {formatDate(transaction.transactionDate)} ·{" "}
                      {transaction.reference || "No reference"}
                    </small>
                  </div>
                  <div>
                    <span className="workspace-label">AMOUNT</span>
                    <strong>
                      {formatMoney(
                        transaction.amount.toString(),
                        transaction.currency,
                      )}
                    </strong>
                  </div>
                </div>
                {exception.details ? (
                  <details className="exception-evidence">
                    <summary>Issue details</summary>
                    <pre>{JSON.stringify(exception.details, null, 2)}</pre>
                  </details>
                ) : null}
                {exception.resolutionNotes ? (
                  <p className="resolution-note">
                    <strong>Resolution note:</strong>{" "}
                    {exception.resolutionNotes}
                  </p>
                ) : null}
                {exception.status === "OPEN" && mayReview ? (
                  <ExceptionReviewActions
                    organizationId={organizationId}
                    exceptionId={exception.id}
                  />
                ) : null}
                <div className="review-history">
                  <span className="workspace-label">REVIEW DECISIONS</span>
                  {transaction.reviewDecisions.length ? (
                    <ul>
                      {transaction.reviewDecisions.map((decision) => (
                        <li
                          key={`${decision.createdAt.toISOString()}-${decision.decisionType}`}
                        >
                          {decision.decisionType.replaceAll("_", " ")} by{" "}
                          {decision.reviewedBy.email} ·{" "}
                          {formatDate(decision.createdAt)}
                          {decision.rationale ? ` — ${decision.rationale}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No review decisions recorded.</p>
                  )}
                </div>
                <div className="review-history">
                  <span className="workspace-label">AUDIT HISTORY</span>
                  {(auditByException.get(exception.id) ?? []).length ? (
                    <ul>
                      {(auditByException.get(exception.id) ?? []).map(
                        (event, index) => (
                          <li
                            key={`${event.occurredAt.toISOString()}-${index}`}
                          >
                            {event.action} by {event.actor?.email ?? "System"} ·{" "}
                            {formatDate(event.occurredAt)}
                            {event.metadata &&
                            typeof event.metadata === "object" &&
                            !Array.isArray(event.metadata) &&
                            "reason" in event.metadata &&
                            typeof event.metadata.reason === "string"
                              ? ` — ${event.metadata.reason}`
                              : ""}
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p>No audit events recorded for this exception.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel empty-state">
          <CircleAlert size={24} />
          <h2>No {selectedStatus.toLowerCase()} exceptions</h2>
          <p>
            {selectedStatus === "OPEN"
              ? "No unresolved issues are recorded for this organization."
              : "There are no exceptions in this status."}
          </p>
        </div>
      )}
      <p className="footnote">
        Showing up to 100 {selectedStatus.toLowerCase()} exceptions.
      </p>
    </div>
  );
}
