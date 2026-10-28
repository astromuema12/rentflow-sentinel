"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KENYAN_COUNTIES } from "@/lib/rental-counties";

type ManagedRental = {
  id: string;
  title: string;
  description: string;
  county: string;
  town: string;
  neighborhood: string;
  price: string;
  pricePeriod: "MONTHLY" | "NIGHTLY";
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  status: string;
  moderationNote: string | null;
  createdAt: string;
  saves: number;
  enquiries: {
    id: string;
    message: string;
    response: string | null;
    status: string;
    createdAt: string;
    renter: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }[];
};

function displayPrice(rental: ManagedRental) {
  return `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(Number(rental.price))} / ${rental.pricePeriod === "MONTHLY" ? "month" : "night"}`;
}

export function LandlordPortal({
  organizationId,
  listings,
  canManage,
}: {
  organizationId: string;
  listings: ManagedRental[];
  canManage: boolean;
}) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function createListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setNotice("");
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const imageUrls = String(formData.get("imageUrls") ?? "")
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      county: formData.get("county"),
      town: formData.get("town"),
      neighborhood: formData.get("neighborhood"),
      price: formData.get("price"),
      pricePeriod: formData.get("pricePeriod"),
      bedrooms: formData.get("bedrooms"),
      bathrooms: formData.get("bathrooms"),
      furnished: formData.get("furnished") === "on",
      imageUrls,
    };
    try {
      const response = await fetch(`/api/landlord/${organizationId}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The listing could not be submitted.");
        return;
      }
      setNotice("Listing submitted. It will appear to renters after review.");
      form.reset();
      router.refresh();
    } catch {
      setError("The listing could not be submitted. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  async function updateListing(listingId: string, status: string) {
    setNotice("");
    setError("");
    try {
      const response = await fetch(
        `/api/landlord/${organizationId}/listings/${listingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The listing could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setError("The listing could not be updated. Check your connection.");
    }
  }

  async function editListing(
    event: React.FormEvent<HTMLFormElement>,
    listingId: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    const formData = new FormData(form);
    try {
      const response = await fetch(
        `/api/landlord/${organizationId}/listings/${listingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.get("title"),
            description: formData.get("description"),
            price: formData.get("price"),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The listing could not be updated.");
        return;
      }
      setNotice(
        "Listing updated. Changes need review before renters can see them.",
      );
      router.refresh();
    } catch {
      setError("The listing could not be updated. Check your connection.");
    }
  }

  async function respondToEnquiry(
    event: React.FormEvent<HTMLFormElement>,
    enquiryId: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    const formData = new FormData(form);
    try {
      const response = await fetch(
        `/api/landlord/${organizationId}/enquiries/${enquiryId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: formData.get("response") }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The reply could not be saved.");
        return;
      }
      setNotice("Reply saved for the renter.");
      router.refresh();
    } catch {
      setError("The reply could not be saved. Check your connection.");
    }
  }

  return (
    <div className="landlord-portal">
      <div className="landlord-metrics">
        <article>
          <span>Published homes</span>
          <strong>
            {listings.filter((item) => item.status === "PUBLISHED").length}
          </strong>
        </article>
        <article>
          <span>Awaiting review</span>
          <strong>
            {listings.filter((item) => item.status === "PENDING_REVIEW").length}
          </strong>
        </article>
        <article>
          <span>Homes saved by renters</span>
          <strong>
            {listings.reduce((total, item) => total + item.saves, 0)}
          </strong>
        </article>
        <article>
          <span>Renter enquiries</span>
          <strong>
            {listings.reduce((total, item) => total + item.enquiries.length, 0)}
          </strong>
        </article>
      </div>

      <div className="landlord-sections">
        <section className="landlord-panel" id="listings">
          <div className="landlord-section-heading">
            <div>
              <p className="market-kicker">PROPERTY PORTFOLIO</p>
              <h2>Your rentals</h2>
            </div>
          </div>
          {listings.length ? (
            <div className="landlord-listing-grid">
              {listings.map((listing) => (
                <article className="landlord-listing" key={listing.id}>
                  <div className="landlord-listing-top">
                    <span
                      className={`listing-status listing-status--${listing.status.toLowerCase()}`}
                    >
                      {listing.status.replaceAll("_", " ")}
                    </span>
                    <span>{displayPrice(listing)}</span>
                  </div>
                  <h3>{listing.title}</h3>
                  <p>
                    {listing.neighborhood} · {listing.town}, {listing.county}
                  </p>
                  <small>
                    {listing.bedrooms} bed · {listing.bathrooms} bath ·{" "}
                    {listing.saves} saves · {listing.enquiries.length} enquiries
                  </small>
                  {listing.moderationNote ? (
                    <p className="listing-moderation-note">
                      Admin note: {listing.moderationNote}
                    </p>
                  ) : null}
                  {canManage &&
                  (listing.status === "DRAFT" ||
                    listing.status === "PAUSED" ||
                    listing.status === "PUBLISHED") ? (
                    <button
                      className="landlord-action-button"
                      onClick={() =>
                        updateListing(
                          listing.id,
                          listing.status === "PUBLISHED"
                            ? "PAUSED"
                            : "PENDING_REVIEW",
                        )
                      }
                      type="button"
                    >
                      {listing.status === "PUBLISHED"
                        ? "Pause listing"
                        : "Submit for review"}
                    </button>
                  ) : canManage && listing.status === "PENDING_REVIEW" ? (
                    <button
                      className="landlord-action-button landlord-action-button--secondary"
                      onClick={() => updateListing(listing.id, "DRAFT")}
                      type="button"
                    >
                      Withdraw submission
                    </button>
                  ) : null}
                  {canManage && listing.status !== "REJECTED" ? (
                    <details className="landlord-edit-details">
                      <summary>Edit rental details</summary>
                      <form
                        onSubmit={(event) => editListing(event, listing.id)}
                      >
                        <label>
                          Title
                          <input
                            name="title"
                            defaultValue={listing.title}
                            minLength={5}
                            maxLength={90}
                            required
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            name="description"
                            defaultValue={listing.description}
                            minLength={30}
                            maxLength={2000}
                            required
                          />
                        </label>
                        <label>
                          Price (KES)
                          <input
                            name="price"
                            defaultValue={listing.price}
                            type="number"
                            min="1"
                            max="10000000"
                            required
                          />
                        </label>
                        <button
                          className="landlord-action-button"
                          type="submit"
                        >
                          Save changes
                        </button>
                      </form>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="landlord-empty-copy">
              Your first rental listing will appear here.
            </p>
          )}
        </section>

        <section className="landlord-panel" id="enquiries">
          <p className="market-kicker">RENTER MESSAGES</p>
          <h2>Enquiries</h2>
          {listings.flatMap((listing) =>
            listing.enquiries.map((enquiry) => (
              <article className="landlord-enquiry" key={enquiry.id}>
                <div>
                  <strong>
                    {enquiry.renter.firstName} {enquiry.renter.lastName}
                  </strong>
                  <a href={`mailto:${enquiry.renter.email}`}>
                    {enquiry.renter.email}
                  </a>
                  <small>
                    About: {listing.title} ·{" "}
                    {new Date(enquiry.createdAt).toLocaleDateString("en-KE")}
                  </small>
                </div>
                <p>{enquiry.message}</p>
                {enquiry.response ? (
                  <p className="landlord-response">
                    <strong>Your reply:</strong> {enquiry.response}
                  </p>
                ) : canManage ? (
                  <form
                    onSubmit={(event) => respondToEnquiry(event, enquiry.id)}
                  >
                    <label>
                      <span>Reply to this renter</span>
                      <textarea
                        name="response"
                        minLength={2}
                        maxLength={1500}
                        required
                      />
                    </label>
                    <button className="landlord-action-button" type="submit">
                      Save reply
                    </button>
                  </form>
                ) : null}
              </article>
            )),
          )}
          {listings.every((listing) => listing.enquiries.length === 0) ? (
            <p className="landlord-empty-copy">
              Renter messages about your published rentals will appear here.
            </p>
          ) : null}
        </section>

        {canManage ? (
          <section className="landlord-panel" id="new-listing">
            <p className="market-kicker">ADD A PROPERTY</p>
            <h2>Create a rental listing</h2>
            <p className="landlord-form-intro">
              Listings are reviewed before they become visible to renters. Add
              only accurate, current rental information.
            </p>
            <form className="landlord-listing-form" onSubmit={createListing}>
              <label>
                Listing title
                <input name="title" minLength={5} maxLength={90} required />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  minLength={30}
                  maxLength={2000}
                  required
                />
              </label>
              <div className="landlord-form-row">
                <label>
                  County
                  <select name="county" required defaultValue="">
                    <option disabled value="">
                      Choose county
                    </option>
                    {KENYAN_COUNTIES.map((county) => (
                      <option key={county}>{county}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Town
                  <input name="town" minLength={2} maxLength={80} required />
                </label>
                <label>
                  Neighbourhood
                  <input
                    name="neighborhood"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>
              </div>
              <div className="landlord-form-row">
                <label>
                  Price (KES)
                  <input
                    name="price"
                    type="number"
                    min="1"
                    max="10000000"
                    required
                  />
                </label>
                <label>
                  Billing period
                  <select name="pricePeriod">
                    <option value="MONTHLY">Monthly</option>
                    <option value="NIGHTLY">Nightly</option>
                  </select>
                </label>
                <label>
                  Bedrooms
                  <input
                    name="bedrooms"
                    type="number"
                    min="0"
                    max="20"
                    required
                  />
                </label>
                <label>
                  Bathrooms
                  <input
                    name="bathrooms"
                    type="number"
                    min="1"
                    max="20"
                    required
                  />
                </label>
              </div>
              <label className="landlord-checkbox">
                <input name="furnished" type="checkbox" /> Furnished
              </label>
              <label>
                Photo URLs (optional, comma separated)
                <input
                  name="imageUrls"
                  placeholder="https://images.unsplash.com/…"
                />
              </label>
              <p className="landlord-form-hint">
                For safety, photos must be hosted on images.unsplash.com. Keep
                addresses and tenant details private.
              </p>
              {error ? (
                <p className="landlord-form-error" role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="landlord-form-notice" role="status">
                  {notice}
                </p>
              ) : null}
              <button
                className="landlord-action-button"
                disabled={pending}
                type="submit"
              >
                {pending ? "Submitting…" : "Submit for review"}
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
