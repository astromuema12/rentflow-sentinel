import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  getPrisma: vi.fn(),
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
vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));

import { PATCH as updateOrganization } from "@/app/api/admin/organizations/[organizationId]/route";
import { PATCH as updateMembership } from "@/app/api/admin/organizations/[organizationId]/memberships/[membershipId]/route";
import { POST as addMembership } from "@/app/api/admin/organizations/[organizationId]/memberships/route";
import { DELETE as removeMembership } from "@/app/api/admin/organizations/[organizationId]/memberships/[membershipId]/route";

const database = {
  organization: { findUnique: vi.fn(), updateMany: vi.fn() },
  organizationMembership: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: { findUnique: vi.fn() },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn(),
};

function request(
  path: string,
  body: unknown,
  method: "POST" | "PATCH" | "DELETE" = "PATCH",
) {
  return new Request(`http://localhost:3000${path}`, {
    method,
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
  mocks.requirePlatformAdmin.mockResolvedValue({ id: "admin-1" });
  mocks.getPrisma.mockReturnValue(database);
  database.$transaction.mockImplementation(
    async (operation: (transaction: typeof database) => unknown) =>
      operation(database),
  );
  database.organization.findUnique.mockResolvedValue({
    id: "org-1",
    name: "North Properties",
    slug: "north-properties",
    isActive: true,
    updatedAt: new Date("2026-11-01T00:00:00.000Z"),
  });
  database.organization.updateMany.mockResolvedValue({ count: 1 });
  database.organizationMembership.findFirst.mockResolvedValue({
    id: "membership-1",
    role: "OPERATOR",
    user: { accountType: "LANDLORD" },
  });
  database.organizationMembership.findUnique.mockResolvedValue(null);
  database.organizationMembership.create.mockResolvedValue({
    id: "membership-1",
  });
  database.organizationMembership.updateMany.mockResolvedValue({ count: 1 });
  database.organizationMembership.deleteMany.mockResolvedValue({ count: 1 });
  database.user.findUnique.mockResolvedValue({
    id: "landlord-1",
    accountType: "LANDLORD",
    isActive: true,
  });
  database.auditEvent.create.mockResolvedValue({ id: "audit-1" });
});

describe("platform-admin organization management", () => {
  it("updates organization details and records the before-and-after values", async () => {
    const response = await updateOrganization(
      request("/api/admin/organizations/org-1", {
        name: "North Rentals",
        slug: "north-rentals",
      }),
      routeParams({ organizationId: "org-1" }),
    );

    expect(response.status).toBe(200);
    expect(database.organization.updateMany).toHaveBeenCalledWith({
      where: {
        id: "org-1",
        updatedAt: new Date("2026-11-01T00:00:00.000Z"),
      },
      data: {
        name: "North Rentals",
        slug: "north-rentals",
        isActive: true,
      },
    });
    expect(database.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "admin-1",
          organizationId: "org-1",
          entityType: "Organization",
          entityId: "org-1",
          metadata: expect.objectContaining({
            previous: expect.objectContaining({ name: "North Properties" }),
            next: expect.objectContaining({ name: "North Rentals" }),
          }),
        }),
      }),
    );
  });

  it("suspends an organization through the same audited update", async () => {
    const response = await updateOrganization(
      request("/api/admin/organizations/org-1", { isActive: false }),
      routeParams({ organizationId: "org-1" }),
    );

    expect(response.status).toBe(200);
    expect(database.organization.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: "North Properties",
          slug: "north-properties",
          isActive: false,
        },
      }),
    );
    expect(database.auditEvent.create).toHaveBeenCalled();
  });

  it("rejects malformed organization slugs without writing", async () => {
    const response = await updateOrganization(
      request("/api/admin/organizations/org-1", { slug: "Invalid Slug!" }),
      routeParams({ organizationId: "org-1" }),
    );

    expect(response.status).toBe(400);
    expect(database.organization.updateMany).not.toHaveBeenCalled();
  });

  it("updates non-owner landlord roles and audits the change", async () => {
    const response = await updateMembership(
      request("/api/admin/organizations/org-1/memberships/membership-1", {
        role: "ADMIN",
      }),
      routeParams({ organizationId: "org-1", membershipId: "membership-1" }),
    );

    expect(response.status).toBe(200);
    expect(database.organizationMembership.updateMany).toHaveBeenCalledWith({
      where: {
        id: "membership-1",
        organizationId: "org-1",
        role: "OPERATOR",
      },
      data: { role: "ADMIN" },
    });
    expect(database.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          actorId: "admin-1",
          entityType: "OrganizationMembership",
          metadata: { previousRole: "OPERATOR", role: "ADMIN" },
        }),
      }),
    );
  });

  it("protects organization owners from platform-admin role changes", async () => {
    database.organizationMembership.findFirst.mockResolvedValue({
      id: "membership-1",
      role: "OWNER",
      user: { accountType: "LANDLORD" },
    });

    const response = await updateMembership(
      request("/api/admin/organizations/org-1/memberships/membership-1", {
        role: "VIEWER",
      }),
      routeParams({ organizationId: "org-1", membershipId: "membership-1" }),
    );

    expect(response.status).toBe(409);
    expect(database.organizationMembership.updateMany).not.toHaveBeenCalled();
  });

  it("adds an existing active landlord with an audited non-owner role", async () => {
    const response = await addMembership(
      request(
        "/api/admin/organizations/org-1/memberships",
        {
          email: "landlord@example.test",
          role: "OPERATOR",
        },
        "POST",
      ),
      routeParams({ organizationId: "org-1" }),
    );

    expect(response.status).toBe(201);
    expect(database.organizationMembership.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        userId: "landlord-1",
        role: "OPERATOR",
      },
      select: { id: true },
    });
    expect(database.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CREATE",
          entityType: "OrganizationMembership",
          metadata: expect.objectContaining({ email: "landlord@example.test" }),
        }),
      }),
    );
  });

  it("removes a non-owner membership and records the revocation", async () => {
    database.organizationMembership.findFirst.mockResolvedValue({
      id: "membership-1",
      role: "OPERATOR",
      userId: "landlord-1",
      user: { accountType: "LANDLORD", email: "landlord@example.test" },
    });

    const response = await removeMembership(
      request(
        "/api/admin/organizations/org-1/memberships/membership-1",
        {},
        "DELETE",
      ),
      routeParams({ organizationId: "org-1", membershipId: "membership-1" }),
    );

    expect(response.status).toBe(200);
    expect(database.organizationMembership.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "membership-1",
        organizationId: "org-1",
        role: "OPERATOR",
      },
    });
    expect(database.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "DELETE",
          entityType: "OrganizationMembership",
          entityId: "membership-1",
        }),
      }),
    );
  });

  it("protects owner memberships from removal", async () => {
    database.organizationMembership.findFirst.mockResolvedValue({
      id: "membership-1",
      role: "OWNER",
      userId: "owner-1",
      user: { accountType: "LANDLORD", email: "owner@example.test" },
    });

    const response = await removeMembership(
      request(
        "/api/admin/organizations/org-1/memberships/membership-1",
        {},
        "DELETE",
      ),
      routeParams({ organizationId: "org-1", membershipId: "membership-1" }),
    );

    expect(response.status).toBe(409);
    expect(database.organizationMembership.deleteMany).not.toHaveBeenCalled();
  });
});
