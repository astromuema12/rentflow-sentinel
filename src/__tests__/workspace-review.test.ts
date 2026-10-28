import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getPrisma: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));

import { MembershipRole } from "@prisma/client";
import { PATCH as reviewException } from "@/app/api/organizations/[organizationId]/exceptions/[exceptionId]/route";
import { PATCH as reviewMatch } from "@/app/api/organizations/[organizationId]/matches/[matchId]/route";

const database = {
  user: { findUnique: vi.fn() },
  organizationMembership: { findUnique: vi.fn() },
  proposedTransactionMatch: { findFirst: vi.fn(), updateMany: vi.fn() },
  normalizedTransaction: { updateMany: vi.fn() },
  reconciliationException: { updateMany: vi.fn(), findFirst: vi.fn() },
  humanReviewDecision: { create: vi.fn() },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn(),
};

function routeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

function request(body: unknown) {
  return new Request("http://localhost/api/review", {
    method: "PATCH",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function authenticate(role: MembershipRole = MembershipRole.OPERATOR) {
  mocks.auth.mockResolvedValue({
    user: { id: "reviewer-1", sessionVersion: 0 },
  });
  database.user.findUnique.mockResolvedValue({
    id: "reviewer-1",
    email: "reviewer@example.test",
    isActive: true,
    sessionVersion: 0,
  });
  database.organizationMembership.findUnique.mockResolvedValue({ role });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  mocks.getPrisma.mockReturnValue(database);
  authenticate();
  database.$transaction.mockImplementation(
    async (operation: (transaction: typeof database) => unknown) =>
      operation(database),
  );
  database.auditEvent.create.mockResolvedValue({ id: "audit-1" });
  database.humanReviewDecision.create.mockResolvedValue({ id: "decision-1" });
});

describe("organization-scoped review operations", () => {
  it("requires operator membership before reviewing a proposed match", async () => {
    authenticate(MembershipRole.VIEWER);
    const response = await reviewMatch(
      request({ decision: "ACCEPT" }),
      routeParams({ organizationId: "org-a", matchId: "match-1" }),
    );
    expect(response.status).toBe(403);
    expect(database.proposedTransactionMatch.findFirst).not.toHaveBeenCalled();
  });

  it("does not mutate a match outside the requested organization", async () => {
    database.proposedTransactionMatch.findFirst.mockResolvedValue(null);
    const response = await reviewMatch(
      request({ decision: "ACCEPT" }),
      routeParams({ organizationId: "org-a", matchId: "match-from-org-b" }),
    );
    expect(response.status).toBe(404);
    expect(database.proposedTransactionMatch.updateMany).not.toHaveBeenCalled();
  });

  it("requires a reason to reject a proposed match", async () => {
    const response = await reviewMatch(
      request({ decision: "REJECT" }),
      routeParams({ organizationId: "org-a", matchId: "match-1" }),
    );
    expect(response.status).toBe(400);
    expect(database.proposedTransactionMatch.findFirst).not.toHaveBeenCalled();
  });

  it("records accepted matches and updates only the same tenant transaction", async () => {
    database.proposedTransactionMatch.findFirst.mockResolvedValue({
      id: "match-1",
      normalizedTransactionId: "transaction-1",
      candidateId: "source-1",
    });
    database.proposedTransactionMatch.updateMany.mockResolvedValue({
      count: 1,
    });
    database.normalizedTransaction.updateMany.mockResolvedValue({ count: 1 });

    const response = await reviewMatch(
      request({ decision: "ACCEPT" }),
      routeParams({ organizationId: "org-a", matchId: "match-1" }),
    );

    expect(response.status).toBe(200);
    expect(database.normalizedTransaction.updateMany).toHaveBeenCalledWith({
      where: { id: "transaction-1", organizationId: "org-a" },
      data: { status: "MATCHED" },
    });
    expect(database.humanReviewDecision.create).toHaveBeenCalled();
    expect(database.auditEvent.create).toHaveBeenCalled();
  });

  it("requires a reason and writes tenant-scoped exception review history", async () => {
    const invalid = await reviewException(
      request({ status: "RESOLVED", reason: "no" }),
      routeParams({ organizationId: "org-a", exceptionId: "exception-1" }),
    );
    expect(invalid.status).toBe(400);

    database.reconciliationException.updateMany.mockResolvedValue({ count: 1 });
    database.reconciliationException.findFirst.mockResolvedValue({
      id: "exception-1",
      normalizedTransactionId: "transaction-1",
    });
    const response = await reviewException(
      request({ status: "RESOLVED", reason: "Reviewed source statement" }),
      routeParams({ organizationId: "org-a", exceptionId: "exception-1" }),
    );

    expect(response.status).toBe(200);
    expect(database.reconciliationException.updateMany).toHaveBeenCalledWith({
      where: { id: "exception-1", organizationId: "org-a", status: "OPEN" },
      data: {
        status: "RESOLVED",
        resolutionNotes: "Reviewed source statement",
      },
    });
    expect(database.humanReviewDecision.create).toHaveBeenCalled();
    expect(database.auditEvent.create).toHaveBeenCalled();
  });
});
