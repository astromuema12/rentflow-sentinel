import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getPrisma: vi.fn(),
  consumeRateLimit: vi.fn(),
  createRateLimitKey: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));
vi.mock("@/lib/auth/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  createRateLimitKey: mocks.createRateLimitKey,
}));

import bcrypt from "bcryptjs";
import { MembershipRole } from "@prisma/client";
import {
  requireAuthenticatedUser,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { consumePasswordResetToken } from "@/lib/auth/password-reset";
import { GET as exportTransactions } from "@/app/api/organizations/[organizationId]/exports/route";
import { GET as getImportRecord } from "@/app/api/organizations/[organizationId]/imports/[importBatchId]/records/[recordId]/route";
import { PATCH as updateMembership } from "@/app/api/organizations/[organizationId]/memberships/[membershipId]/route";
import { PATCH as updateTransaction } from "@/app/api/organizations/[organizationId]/transactions/[transactionId]/route";

const database = {
  user: { findUnique: vi.fn(), update: vi.fn() },
  organizationMembership: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  normalizedTransaction: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  },
  importedSourceRecord: { findFirst: vi.fn() },
  passwordResetToken: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn(),
};

function authenticate(role: MembershipRole = MembershipRole.OPERATOR) {
  mocks.auth.mockResolvedValue({
    user: { id: "user-a", sessionVersion: 4, email: "a@example.test" },
  });
  database.user.findUnique.mockResolvedValue({
    id: "user-a",
    email: "a@example.test",
    isActive: true,
    sessionVersion: 4,
  });
  database.organizationMembership.findUnique.mockResolvedValue({ role });
}

function routeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.AUTH_SECRET = "test-secret-with-adequate-randomness";
  mocks.getPrisma.mockReturnValue(database);
  mocks.consumeRateLimit.mockResolvedValue(true);
  mocks.createRateLimitKey.mockImplementation(
    (scope: string, value: string) => `${scope}:${value}`,
  );
  database.$transaction.mockImplementation(
    async (operation: (transaction: typeof database) => unknown) =>
      operation(database),
  );
  database.auditEvent.create.mockResolvedValue({ id: "audit-1" });
});

describe("server authentication and organization authorization", () => {
  it("rejects unauthenticated access before reading organization data", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(
      requireOrganizationAccess("org-a", MembershipRole.VIEWER),
    ).rejects.toMatchObject({ status: 401 });

    const response = await exportTransactions(
      new Request("http://localhost/api"),
      routeParams({ organizationId: "org-a" }),
    );
    expect(response.status).toBe(401);
    expect(database.normalizedTransaction.findMany).not.toHaveBeenCalled();
  });

  it("rejects revoked, inactive, and stale-session users", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireAuthenticatedUser()).rejects.toMatchObject({
      status: 401,
    });

    mocks.auth.mockResolvedValue({
      user: { id: "user-a", sessionVersion: 3 },
    });
    database.user.findUnique.mockResolvedValue({
      id: "user-a",
      isActive: true,
      sessionVersion: 4,
    });
    await expect(requireAuthenticatedUser()).rejects.toMatchObject({
      status: 401,
    });

    mocks.auth.mockResolvedValue({
      user: { id: "user-a", sessionVersion: 4 },
    });
    database.user.findUnique.mockResolvedValue({
      id: "user-a",
      isActive: false,
      sessionVersion: 4,
    });
    await expect(requireAuthenticatedUser()).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects a role below the operation's minimum", async () => {
    authenticate(MembershipRole.VIEWER);
    const request = new Request("http://localhost/api", {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "RECONCILED" }),
    });

    const response = await updateTransaction(
      request,
      routeParams({ organizationId: "org-a", transactionId: "tx-a" }),
    );

    expect(response.status).toBe(403);
    expect(database.normalizedTransaction.updateMany).not.toHaveBeenCalled();
  });

  it("rejects invalid transaction payloads before any write", async () => {
    authenticate(MembershipRole.OPERATOR);
    const request = new Request("http://localhost/api", {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "OWNER" }),
    });

    const response = await updateTransaction(
      request,
      routeParams({ organizationId: "org-a", transactionId: "tx-a" }),
    );

    expect(response.status).toBe(400);
    expect(database.normalizedTransaction.updateMany).not.toHaveBeenCalled();
  });

  it("does not read another tenant's transactions", async () => {
    authenticate();
    database.organizationMembership.findUnique.mockResolvedValue(null);

    const response = await exportTransactions(
      new Request("http://localhost/api"),
      routeParams({ organizationId: "org-b" }),
    );

    expect(response.status).toBe(404);
    expect(database.normalizedTransaction.findMany).not.toHaveBeenCalled();
  });

  it("scopes transaction modifications by both record and organization IDs", async () => {
    authenticate();
    database.normalizedTransaction.updateMany.mockResolvedValue({ count: 0 });
    const request = new Request("http://localhost/api", {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "RECONCILED" }),
    });

    const response = await updateTransaction(
      request,
      routeParams({
        organizationId: "org-a",
        transactionId: "tx-owned-by-org-b",
      }),
    );

    expect(response.status).toBe(404);
    expect(database.normalizedTransaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx-owned-by-org-b", organizationId: "org-a" },
      }),
    );
    expect(database.auditEvent.create).not.toHaveBeenCalled();
  });

  it("uses the current membership on every protected request", async () => {
    authenticate(MembershipRole.OPERATOR);
    await expect(
      requireOrganizationAccess("org-a", MembershipRole.OPERATOR),
    ).resolves.toMatchObject({ role: MembershipRole.OPERATOR });

    database.organizationMembership.findUnique.mockResolvedValue(null);
    await expect(
      requireOrganizationAccess("org-a", MembershipRole.VIEWER),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("uses bcrypt hashes for credential verification and rejects invalid credentials", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    database.user.findUnique.mockResolvedValue({
      id: "user-a",
      email: "person@example.test",
      passwordHash,
      isActive: true,
      sessionVersion: 4,
      firstName: "Rent",
      lastName: "Manager",
    });

    const result = await authorizeCredentials(
      { email: "Person@Example.test", password: "correct-password" },
      new Request("http://localhost/api/auth"),
    );

    expect(result).toMatchObject({
      id: "user-a",
      email: "person@example.test",
      name: "Rent Manager",
      sessionVersion: 4,
    });
    expect(database.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "person@example.test" } }),
    );
    expect(
      await authorizeCredentials(
        { email: "not-an-email", password: "x" },
        new Request("http://localhost/api/auth"),
      ),
    ).toBeNull();
  });

  it("rejects invalid and expired password-reset tokens without changing accounts", async () => {
    database.passwordResetToken.findUnique.mockResolvedValue(null);
    await expect(
      consumePasswordResetToken("a".repeat(43), "a-secure-password-123"),
    ).resolves.toBe(false);
    expect(database.$transaction).not.toHaveBeenCalled();

    database.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-a",
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      consumePasswordResetToken("b".repeat(43), "a-secure-password-123"),
    ).resolves.toBe(false);
    expect(database.user.update).not.toHaveBeenCalled();
  });

  it("atomically consumes a reset token and revokes existing sessions", async () => {
    database.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-a",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    database.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    database.user.update.mockResolvedValue({ id: "user-a" });

    await expect(
      consumePasswordResetToken("c".repeat(43), "a-secure-password-123"),
    ).resolves.toBe(true);

    expect(database.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "reset-1", consumedAt: null }),
      }),
    );
    expect(database.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-a" },
        data: expect.objectContaining({
          sessionVersion: { increment: 1 },
          passwordHash: expect.any(String),
        }),
      }),
    );
  });

  it("keeps exports tenant-scoped and protected", async () => {
    authenticate(MembershipRole.VIEWER);
    database.normalizedTransaction.findMany.mockResolvedValue([
      {
        transactionDate: new Date("2026-01-02T00:00:00.000Z"),
        type: "CREDIT",
        amount: { toString: () => "1200.00" },
        currency: "KES",
        status: "MATCHED",
        reference: '=HYPERLINK("https://example.test")',
        description: "Rent",
        payerPayee: "Tenant",
      },
    ]);

    const response = await exportTransactions(
      new Request("http://localhost/api"),
      routeParams({ organizationId: "org-a" }),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(csv).toContain("'=HYPERLINK");
    expect(database.normalizedTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-a" } }),
    );
  });

  it("scopes imported-file access by organization and batch", async () => {
    authenticate(MembershipRole.VIEWER);
    database.importedSourceRecord.findFirst.mockResolvedValue(null);
    const response = await getImportRecord(
      new Request("http://localhost/api"),
      routeParams({
        organizationId: "org-a",
        importBatchId: "batch-from-org-b",
        recordId: "record-from-org-b",
      }),
    );

    expect(response.status).toBe(404);
    expect(database.importedSourceRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "record-from-org-b",
          importBatchId: "batch-from-org-b",
          organizationId: "org-a",
        },
      }),
    );
  });

  it("requires authentication before reading an imported file", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await getImportRecord(
      new Request("http://localhost/api"),
      routeParams({
        organizationId: "org-a",
        importBatchId: "batch-a",
        recordId: "record-a",
      }),
    );

    expect(response.status).toBe(401);
    expect(database.importedSourceRecord.findFirst).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant membership changes before writing", async () => {
    authenticate(MembershipRole.ADMIN);
    database.organizationMembership.findFirst.mockResolvedValue(null);
    const request = new Request("http://localhost/api", {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "VIEWER" }),
    });

    const response = await updateMembership(
      request,
      routeParams({
        organizationId: "org-a",
        membershipId: "membership-from-org-b",
      }),
    );

    expect(response.status).toBe(404);
    expect(database.organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "membership-from-org-b", organizationId: "org-a" },
      }),
    );
    expect(database.organizationMembership.updateMany).not.toHaveBeenCalled();
  });

  it("prevents removing the final organization owner", async () => {
    authenticate(MembershipRole.OWNER);
    database.organizationMembership.findFirst.mockResolvedValue({
      id: "membership-a",
      userId: "user-b",
      role: MembershipRole.OWNER,
    });
    database.organizationMembership.count.mockResolvedValue(1);
    const request = new Request("http://localhost/api", {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "ADMIN" }),
    });

    const response = await updateMembership(
      request,
      routeParams({ organizationId: "org-a", membershipId: "membership-a" }),
    );

    expect(response.status).toBe(409);
    expect(database.organizationMembership.updateMany).not.toHaveBeenCalled();
  });

  it("updates membership roles and checks the new role on the next request", async () => {
    authenticate(MembershipRole.OWNER);
    database.organizationMembership.findFirst
      .mockResolvedValueOnce({
        id: "membership-a",
        userId: "user-b",
        role: MembershipRole.VIEWER,
      })
      .mockResolvedValueOnce({
        id: "membership-a",
        userId: "user-b",
        role: MembershipRole.ADMIN,
      });
    database.organizationMembership.updateMany.mockResolvedValue({ count: 1 });
    const request = new Request("http://localhost/api", {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role: "ADMIN" }),
    });

    const response = await updateMembership(
      request,
      routeParams({ organizationId: "org-a", membershipId: "membership-a" }),
    );

    expect(response.status).toBe(200);
    expect(database.organizationMembership.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "membership-a", organizationId: "org-a" },
      }),
    );
    expect(database.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-a",
          actorId: "user-a",
          entityType: "OrganizationMembership",
        }),
      }),
    );

    database.organizationMembership.findUnique.mockResolvedValue({
      role: MembershipRole.VIEWER,
    });
    await expect(
      requireOrganizationAccess("org-a", MembershipRole.OPERATOR),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("rejects cross-origin state-changing requests", async () => {
    authenticate();
    const response = await updateTransaction(
      new Request("http://localhost/api", {
        method: "PATCH",
        headers: {
          Origin: "https://attacker.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "RECONCILED" }),
      }),
      routeParams({ organizationId: "org-a", transactionId: "tx-a" }),
    );

    expect(response.status).toBe(403);
    expect(database.organizationMembership.findUnique).not.toHaveBeenCalled();
  });
});
