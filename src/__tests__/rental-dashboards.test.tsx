import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TenantRentals } from "@/app/tenant/tenant-rentals";
import type { RentalCardListing } from "@/app/tenant/rental-types";

const listings: RentalCardListing[] = [
  {
    id: "monthly-home",
    title: "A leafy apartment",
    county: "Nairobi City",
    town: "Nairobi",
    neighborhood: "Kilimani",
    price: "50000",
    pricePeriod: "MONTHLY",
    bedrooms: 2,
    bathrooms: 1,
    furnished: true,
    imageUrls: [],
  },
  {
    id: "nightly-home",
    title: "A quiet coastal stay",
    county: "Kilifi",
    town: "Watamu",
    neighborhood: "Watamu",
    price: "4500",
    pricePeriod: "NIGHTLY",
    bedrooms: 1,
    bathrooms: 1,
    furnished: false,
    imageUrls: [],
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("tenant rental dashboard", () => {
  it("filters by county, stay period, bedrooms, and period-matched budget", () => {
    render(
      <TenantRentals listings={listings} savedListingIds={[]} enquiries={[]} />,
    );

    fireEvent.change(screen.getByLabelText("County"), {
      target: { value: "Nairobi City" },
    });
    fireEvent.change(screen.getByLabelText("Stay"), {
      target: { value: "MONTHLY" },
    });
    fireEvent.change(screen.getByLabelText("Bedrooms"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Max KES"), {
      target: { value: "50000" },
    });

    expect(
      screen.getByRole("heading", { name: "A leafy apartment" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "A quiet coastal stay" }),
    ).not.toBeInTheDocument();
  });

  it("removes a home from the saved view immediately after unsaving", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ saved: false }),
      }),
    );
    render(
      <TenantRentals
        listings={listings}
        savedListingIds={["monthly-home"]}
        enquiries={[]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Saved homes/ }));
    expect(
      screen.getByRole("heading", { name: "A leafy apartment" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Your saved homes will be here" }),
      ).toBeInTheDocument();
    });
  });

  it("shows landlord responses in the renter's enquiry history", () => {
    render(
      <TenantRentals
        listings={listings}
        savedListingIds={[]}
        enquiries={[
          {
            id: "enquiry-1",
            listingId: "monthly-home",
            message: "Is this home available next month?",
            response: "Yes, it is available from the first.",
            status: "RESPONDED",
            createdAt: "2026-10-28T10:00:00.000Z",
            listing: {
              title: "A leafy apartment",
              town: "Nairobi",
              county: "Nairobi City",
            },
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: /My enquiries/ }));
    expect(
      screen.getByText("Yes, it is available from the first."),
    ).toBeInTheDocument();
  });
});
