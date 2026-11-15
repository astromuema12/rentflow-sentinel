import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  getPrisma: vi.fn(),
  sendOrganizationInvitationEmail: vi.fn(),
  consumeRateLimit: vi.fn(),
  createRateLimitKey: vi.fn(),
}));

vi.mock("@/lib/auth/authorization", () => ({
  requirePlatformAdmin: mocks.requirePlatformAdmin,
  authorizationErrorResponse: (error: unknown) => {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;
    return Response.json({ error: "Request failed." }, { status });
  },
}));
vi.mock("@/lib/auth/email", () => ({
  EmailDeliveryError: class EmailDeliveryError extends Error {},
  sendOrganizationInvitationEmail: mocks.sendOrganizationInvitationEmail,
}));
vi.mock("@/lib/auth/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  createRateLimitKey: mocks.createRateLimitKey,
}));
vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));

import { POST as createOrganization } from "@/app/api/admin/organizations/route";
import { POST as acceptInvitation } from "@/app/api/auth/organization-invitations/accept/route";
import { POST as resendInvitation } from "@/app/api/admin/organizations/invitations/[invitationId]/resend/route";

const database = {
  organization: { create: vi.fn() },
  organizationInvitation: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  organizationMembership: { create: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn() },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn(),
};

function request(path: string, body: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function routeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  mocks.requirePlatformAdmin.mockResolvedValue({ id: "admin-a" });
  mocks.getPrisma.mockReturnValue(database);
  mocks.sendOrganizationInvitationEmail.mockResolvedValue(undefined);
  mocks.consumeRateLimit.mockResolvedValue(true);
  mocks.createRateLimitKey.mockImplementation(
    (scope: string, value: string) => `${scope}:${value}`,
  );
  database.$transaction.mockImplementation(
    async (operation: (transaction: typeof database) => unknown) =>
      operation(database),
  );
  database.organization.create.mockResolvedValue({
    id: "organization-a",
    name: "North Properties",
  });
  database.organizationInvitation.create.mockResolvedValue({
    id: "invitation-a",
  });
  database.organizationInvitation.findFirst.mockResolvedValue(null);
  database.organizationInvitation.findUnique.mockResolvedValue(null);
  database.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
  database.user.findUnique.mockResolvedValue(null);
  database.user.create.mockResolvedValue({ id: "owner-a" });
  database.organizationMembership.create.mockResolvedValue({
    id: "membership-a",
  });
  database.auditEvent.create.mockResolvedValue({ id: "audit-a" });
});

describe("organization owner invitations", () => {
  it("creates an organization, records an invitation, and emails a one-time link", async () => {
    const response = await createOrganization(
      request("/api/admin/organizations", {
        name: "North Properties",
        slug: "north-properties",
        firstName: "Amina",
        lastName: "Njoroge",
        email: "OWNER@example.test",
      }),
    );

    expect(response.status).toBe(201);
    expect(database.organization.create).toHaveBeenCalledWith({
      data: {
        name: "North Properties",
        slug: "north-properties",
        currency: "KES",
      },
      select: { id: true, name: true },
    });
    const inviteData =
      database.organizationInvitation.create.mock.calls[0][0].data;
    expect(inviteData).toEqual(
      expect.objectContaining({
        organizationId: "organization-a",
        email: "owner@example.test",
        createdById: "admin-a",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
    expect(inviteData.tokenHash).not.toHaveLength(43);
    expect(mocks.sendOrganizationInvitationEmail).toHaveBeenCalledWith(
      "owner@example.test",
      "Amina",
      "North Properties",
      expect.stringMatching(/^http:\/\/localhost:3000\/accept-invitation\?/),
    );
    expect(database.auditEvent.create).toHaveBeenCalled();
  });

  it("reports failed delivery and keeps the invitation available for retry", async () => {
    mocks.sendOrganizationInvitationEmail.mockRejectedValue(
      new Error("email unavailable"),
    );

    const response = await createOrganization(
      request("/api/admin/organizations", {
        name: "North Properties",
        slug: "north-properties",
        firstName: "Amina",
        lastName: "Njoroge",
        email: "owner@example.test",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      invitationId: "invitation-a",
    });
    expect(database.organization.create).toHaveBeenCalled();
  });

  it("rejects malformed organization data before creating records", async () => {
    const response = await createOrganization(
      request("/api/admin/organizations", {
        name: "North Properties",
        slug: "North Properties!",
        firstName: "Amina",
        lastName: "Njoroge",
        email: "owner@example.test",
      }),
    );

    expect(response.status).toBe(400);
    expect(database.organization.create).not.toHaveBeenCalled();
  });

  it("creates a landlord and owner membership when a valid invite is accepted", async () => {
    const invitation = {
      id: "invitation-a",
      organizationId: "organization-a",
      email: "owner@example.test",
      firstName: "Amina",
      lastName: "Njoroge",
      tokenHash: "token-hash",
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      organization: { isActive: true },
    };
    database.organizationInvitation.findUnique
      .mockResolvedValueOnce(invitation)
      .mockResolvedValueOnce(invitation);

    const response = await acceptInvitation(
      request("/api/auth/organization-invitations/accept", {
        token: "A".repeat(43),
        password: "a-secure-owner-password-123",
      }),
    );

    expect(response.status).toBe(200);
    expect(database.organizationInvitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "invitation-a",
          tokenHash: expect.any(String),
          acceptedAt: null,
        }),
      }),
    );
    expect(database.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "owner@example.test",
        accountType: "LANDLORD",
        passwordHash: expect.any(String),
      }),
      select: { id: true },
    });
    expect(database.user.create.mock.calls[0][0].data.passwordHash).not.toBe(
      "a-secure-owner-password-123",
    );
    expect(database.organizationMembership.create).toHaveBeenCalledWith({
      data: {
        organizationId: "organization-a",
        userId: "owner-a",
        role: "OWNER",
      },
      select: { id: true },
    });
    expect(database.auditEvent.create).toHaveBeenCalled();
  });

  it("rejects used or expired invitations without creating an account", async () => {
    database.organizationInvitation.findUnique.mockResolvedValue({
      id: "invitation-a",
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const response = await acceptInvitation(
      request("/api/auth/organization-invitations/accept", {
        token: "A".repeat(43),
        password: "a-secure-owner-password-123",
      }),
    );

    expect(response.status).toBe(400);
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.user.create).not.toHaveBeenCalled();
  });

  it("does not accept an owner invitation for a suspended organization", async () => {
    const invitation = {
      id: "invitation-a",
      organizationId: "organization-a",
      email: "owner@example.test",
      firstName: "Amina",
      lastName: "Njoroge",
      tokenHash: "token-hash",
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      organization: { isActive: false },
    };
    database.organizationInvitation.findUnique
      .mockResolvedValueOnce(invitation)
      .mockResolvedValueOnce(invitation);

    const response = await acceptInvitation(
      request("/api/auth/organization-invitations/accept", {
        token: "A".repeat(43),
        password: "a-secure-owner-password-123",
      }),
    );

    expect(response.status).toBe(400);
    expect(database.user.create).not.toHaveBeenCalled();
    expect(database.organizationMembership.create).not.toHaveBeenCalled();
  });

  it("rotates the token and audits an invitation resend", async () => {
    database.organizationInvitation.findFirst.mockResolvedValue({
      id: "invitation-a",
      organizationId: "organization-a",
      tokenHash: "old-hash",
      email: "owner@example.test",
      firstName: "Amina",
      organization: { name: "North Properties", isActive: true },
    });

    const response = await resendInvitation(
      request("/api/admin/organizations/invitations/invitation-a/resend", {}),
      routeParams({ invitationId: "invitation-a" }),
    );

    expect(response.status).toBe(200);
    expect(database.organizationInvitation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "invitation-a",
          tokenHash: "old-hash",
          acceptedAt: null,
        },
        data: {
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      }),
    );
    expect(database.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityType: "OrganizationInvitation",
          entityId: "invitation-a",
          metadata: expect.objectContaining({ action: "resent" }),
        }),
      }),
    );
  });
});
