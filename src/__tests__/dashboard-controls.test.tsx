import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

import { AdminDashboard } from "@/app/admin/admin-dashboard";
import { LandlordPortal } from "@/app/landlord/landlord-portal";

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
    render(<AdminDashboard accounts={[]} listings={[]} invitations={[]} />);

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
