import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

import { AdminDashboard } from "@/app/admin/admin-dashboard";
import { LandlordPortal } from "@/app/landlord/landlord-portal";

const emptyAdminData = {
  accounts: [],
  listings: [],
  invitations: [],
  organizations: [],
  auditEvents: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard controls", () => {
  it("creates an organization and reports successful owner invitation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invitationId: "invitation-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminDashboard {...emptyAdminData} />);

    fireEvent.change(screen.getByLabelText("Organization name"), {
      target: { value: "North Properties" },
    });
    fireEvent.change(screen.getByLabelText("Organization slug"), {
      target: { value: "north-properties" },
    });
    fireEvent.change(screen.getByLabelText("Owner first name"), {
      target: { value: "Sam" },
    });
    fireEvent.change(screen.getByLabelText("Owner last name"), {
      target: { value: "Njoroge" },
    });
    fireEvent.change(screen.getByLabelText("Owner email"), {
      target: { value: "owner@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create and invite owner" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Organization created and owner invitation sent.",
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/organizations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "North Properties",
          slug: "north-properties",
          firstName: "Sam",
          lastName: "Njoroge",
          email: "owner@example.test",
        }),
      }),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("filters accounts by search, type, and status", () => {
    render(
      <AdminDashboard
        {...emptyAdminData}
        accounts={[
          {
            id: "renter-1",
            name: "Amina Njoroge",
            email: "amina@example.test",
            accountType: "RENTER",
            isActive: true,
            createdAt: "2026-11-01T10:00:00.000Z",
          },
          {
            id: "landlord-1",
            name: "Sam Owner",
            email: "sam@example.test",
            accountType: "LANDLORD",
            isActive: false,
            createdAt: "2026-11-02T10:00:00.000Z",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search accounts"), {
      target: { value: "sam@" },
    });
    fireEvent.change(screen.getByLabelText("Account type"), {
      target: { value: "LANDLORD" },
    });
    fireEvent.change(screen.getByLabelText("Account status"), {
      target: { value: "SUSPENDED" },
    });

    expect(screen.getByText("sam@example.test")).toBeInTheDocument();
    expect(screen.queryByText("amina@example.test")).not.toBeInTheDocument();
  });

  it("filters moderation queues and audit events", () => {
    render(
      <AdminDashboard
        {...emptyAdminData}
        listings={[
          {
            id: "listing-1",
            title: "Coastal apartment",
            county: "Kilifi",
            town: "Watamu",
            neighborhood: "Watamu",
            price: "5000",
            pricePeriod: "NIGHTLY",
            status: "PUBLISHED",
            organization: "Coast Homes",
            createdBy: "owner@example.test",
            savedCount: 2,
            enquiryCount: 1,
          },
          {
            id: "listing-2",
            title: "City rental",
            county: "Nairobi City",
            town: "Nairobi",
            neighborhood: "Kilimani",
            price: "50000",
            pricePeriod: "MONTHLY",
            status: "PENDING_REVIEW",
            organization: "North Properties",
            createdBy: "landlord@example.test",
            savedCount: 0,
            enquiryCount: 0,
          },
        ]}
        auditEvents={[
          {
            id: "event-1",
            action: "ACCESS_DENIED",
            entityType: "Authorization",
            entityId: null,
            metadata: "security review",
            occurredAt: "2026-11-01T10:00:00.000Z",
            actor: "staff@example.test",
            organization: "",
          },
          {
            id: "event-2",
            action: "CREATE",
            entityType: "Organization",
            entityId: "org-1",
            metadata: "created record",
            occurredAt: "2026-11-02T10:00:00.000Z",
            actor: "admin@example.test",
            organization: "North Properties",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search listings"), {
      target: { value: "Coast" },
    });
    fireEvent.change(screen.getByLabelText("Listing status"), {
      target: { value: "PUBLISHED" },
    });
    fireEvent.change(screen.getByLabelText("Search audit history"), {
      target: { value: "security" },
    });
    fireEvent.change(screen.getByLabelText("Audit action"), {
      target: { value: "ACCESS_DENIED" },
    });

    expect(screen.getByText("Coastal apartment")).toBeInTheDocument();
    expect(screen.queryByText("City rental")).not.toBeInTheDocument();
    expect(screen.getByText("staff@example.test")).toBeInTheDocument();
    expect(screen.queryByText("admin@example.test")).not.toBeInTheDocument();
  });

  it("suspends organizations and lets admins update non-owner member roles", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updated: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <AdminDashboard
        {...emptyAdminData}
        organizations={[
          {
            id: "org-1",
            name: "North Properties",
            slug: "north-properties",
            isActive: true,
            createdAt: "2026-10-01T10:00:00.000Z",
            memberCount: 2,
            members: [
              {
                id: "owner-membership",
                userId: "owner-1",
                email: "owner@example.test",
                name: "Owner",
                accountType: "LANDLORD",
                role: "OWNER",
              },
              {
                id: "operator-membership",
                userId: "operator-1",
                email: "operator@example.test",
                name: "Operator",
                accountType: "LANDLORD",
                role: "OPERATOR",
              },
            ],
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Add existing landlord"), {
      target: { value: "new@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Initial role"), {
      target: { value: "VIEWER" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add member" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/organizations/org-1/memberships",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "new@example.test",
            role: "VIEWER",
          }),
        }),
      );
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Suspend organization" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm suspension" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/organizations/org-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ isActive: false }),
        }),
      );
    });

    fireEvent.click(screen.getByText("Edit organization and members"));
    fireEvent.change(screen.getByLabelText("Role for operator@example.test"), {
      target: { value: "ADMIN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save role" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/organizations/org-1/memberships/operator-membership",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ role: "ADMIN" }),
        }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/organizations/org-1/memberships/operator-membership",
        { method: "DELETE" },
      );
    });
    expect(screen.getByText("Owner role protected")).toBeInTheDocument();
  });

  it("submits a landlord listing and refreshes the listing dashboard", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "listing-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LandlordPortal organizationId="org-1" listings={[]} canManage={true} />,
    );

    fireEvent.change(screen.getByLabelText("Listing title"), {
      target: { value: "Sunny two-bedroom apartment" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: {
        value:
          "Bright apartment close to public transport, shops, and local schools.",
      },
    });
    fireEvent.change(screen.getByLabelText("County"), {
      target: { value: "Nairobi City" },
    });
    fireEvent.change(screen.getByLabelText("Town"), {
      target: { value: "Nairobi" },
    });
    fireEvent.change(screen.getByLabelText("Neighbourhood"), {
      target: { value: "Kilimani" },
    });
    fireEvent.change(screen.getByLabelText("Price (KES)"), {
      target: { value: "50000" },
    });
    fireEvent.change(screen.getByLabelText("Bedrooms"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Bathrooms"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Listing submitted. It will appear to renters after review.",
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/landlord/org-1/listings",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"county":"Nairobi City"'),
      }),
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
