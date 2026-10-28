"use client";

import { useMemo, useState } from "react";
import { KENYAN_COUNTIES } from "@/lib/rental-counties";
import type { RentalCardListing } from "./rental-types";
import { RentalCard } from "./rental-card";

type RenterEnquiry = {
  id: string;
  listingId: string;
  message: string;
  response: string | null;
  status: string;
  createdAt: string;
  listing: { title: string; town: string; county: string };
};

export function TenantRentals({
  listings,
  savedListingIds,
  enquiries,
}: {
  listings: RentalCardListing[];
  savedListingIds: string[];
  enquiries: RenterEnquiry[];
}) {
  const [view, setView] = useState<"browse" | "saved" | "enquiries">("browse");
  const [county, setCounty] = useState("");
  const [period, setPeriod] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [budget, setBudget] = useState("");
  const [area, setArea] = useState("");
  const [savedIds, setSavedIds] = useState(() => new Set(savedListingIds));
  const [renterEnquiries, setRenterEnquiries] = useState(enquiries);
  const savedSet = useMemo(() => savedIds, [savedIds]);
  const enquirySet = useMemo(
    () => new Set(renterEnquiries.map((enquiry) => enquiry.listingId)),
    [renterEnquiries],
  );
  const visibleListings = useMemo(
    () =>
      listings.filter((listing) => {
        return (
          (view === "browse" ||
            (view === "saved" && savedSet.has(listing.id))) &&
          (!county || listing.county === county) &&
          (!period || listing.pricePeriod === period) &&
          (!bedrooms || listing.bedrooms >= Number(bedrooms)) &&
          (!budget ||
            (Boolean(period) &&
              listing.pricePeriod === period &&
              Number(listing.price) <= Number(budget))) &&
          (!area ||
            `${listing.title} ${listing.neighborhood} ${listing.town} ${listing.county}`
              .toLowerCase()
              .includes(area.toLowerCase()))
        );
      }),
    [area, bedrooms, budget, county, listings, period, savedSet, view],
  );

  return (
    <>
      <div className="tenant-toolbar">
        <div
          className="tenant-view-switch"
          role="tablist"
          aria-label="Rental view"
        >
          <button
            aria-selected={view === "browse"}
            aria-controls="rental-results"
            onClick={() => setView("browse")}
            role="tab"
            type="button"
          >
            Browse homes
          </button>
          <button
            aria-selected={view === "saved"}
            aria-controls="rental-results"
            onClick={() => setView("saved")}
            role="tab"
            type="button"
          >
            Saved homes <span>{savedIds.size}</span>
          </button>
          <button
            aria-selected={view === "enquiries"}
            aria-controls="rental-results"
            onClick={() => setView("enquiries")}
            role="tab"
            type="button"
          >
            My enquiries <span>{renterEnquiries.length}</span>
          </button>
        </div>
        {view !== "enquiries" ? (
          <div className="tenant-filters" aria-label="Filter available rentals">
            <label>
              <span>County</span>
              <select
                value={county}
                onChange={(event) => setCounty(event.target.value)}
              >
                <option value="">All 47 counties</option>
                {KENYAN_COUNTIES.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Area or home</span>
              <input
                onChange={(event) => setArea(event.target.value)}
                placeholder="Town, neighbourhood"
                value={area}
              />
            </label>
            <label>
              <span>Stay</span>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="">Any stay</option>
                <option value="MONTHLY">Monthly</option>
                <option value="NIGHTLY">Nightly</option>
              </select>
            </label>
            <label>
              <span>Max KES</span>
              <input
                disabled={!period}
                min="0"
                onChange={(event) => setBudget(event.target.value)}
                placeholder={period ? "Any budget" : "Choose stay"}
                type="number"
                value={budget}
              />
            </label>
            <label>
              <span>Bedrooms</span>
              <select
                value={bedrooms}
                onChange={(event) => setBedrooms(event.target.value)}
              >
                <option value="">Any</option>
                <option value="1">1 or more</option>
                <option value="2">2 or more</option>
                <option value="3">3 or more</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div id="rental-results" role="tabpanel">
        {view === "enquiries" ? (
          renterEnquiries.length ? (
            <div className="renter-enquiry-list">
              {renterEnquiries.map((enquiry) => (
                <article className="renter-enquiry-card" key={enquiry.id}>
                  <p className="rental-location">
                    {enquiry.listing.town}, {enquiry.listing.county} ·{" "}
                    {new Date(enquiry.createdAt).toLocaleDateString("en-KE")}
                  </p>
                  <h2>{enquiry.listing.title}</h2>
                  <p>
                    <strong>Your message</strong>
                    <br />
                    {enquiry.message}
                  </p>
                  <p className="renter-enquiry-response">
                    <strong>Property manager response</strong>
                    <br />
                    {enquiry.response ??
                      "No response yet. You can check back here for an update."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rental-empty-state">
              <h2>No enquiries yet</h2>
              <p>
                When you contact a property manager, your conversation will
                appear here.
              </p>
              <button type="button" onClick={() => setView("browse")}>
                Browse available homes
              </button>
            </div>
          )
        ) : visibleListings.length ? (
          <div className="rental-card-grid">
            {visibleListings.map((listing) => (
              <RentalCard
                hasEnquiry={enquirySet.has(listing.id)}
                initiallySaved={savedSet.has(listing.id)}
                key={listing.id}
                listing={listing}
                onSavedChange={(saved) => {
                  setSavedIds((current) => {
                    const updated = new Set(current);
                    if (saved) updated.add(listing.id);
                    else updated.delete(listing.id);
                    return updated;
                  });
                }}
                onEnquirySent={(message) => {
                  setRenterEnquiries((current) => [
                    {
                      id: `local-${listing.id}-${Date.now()}`,
                      listingId: listing.id,
                      message,
                      response: null,
                      status: "NEW",
                      createdAt: new Date().toISOString(),
                      listing: {
                        title: listing.title,
                        town: listing.town,
                        county: listing.county,
                      },
                    },
                    ...current,
                  ]);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rental-empty-state">
            <span className="rental-empty-icon" aria-hidden="true">
              ⌂
            </span>
            <h2>
              {view === "saved"
                ? "Your saved homes will be here"
                : "No available rentals match yet"}
            </h2>
            <p>
              {view === "saved"
                ? "Browse published rentals and save the ones you would like to come back to."
                : "Try another county or stay type. New homes appear here after a property manager publishes them."}
            </p>
            {view === "saved" ? (
              <button type="button" onClick={() => setView("browse")}>
                Browse available homes
              </button>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
