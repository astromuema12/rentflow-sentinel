"use client";

import Image from "next/image";
import { useState } from "react";
import type { RentalCardListing } from "./rental-types";

function formatPrice(price: string, period: RentalCardListing["pricePeriod"]) {
  const amount = new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Number(price));
  return `KES ${amount} / ${period === "MONTHLY" ? "month" : "night"}`;
}

export function RentalCard({
  listing,
  initiallySaved,
  hasEnquiry,
  onSavedChange,
  onEnquirySent,
}: {
  listing: RentalCardListing;
  initiallySaved: boolean;
  hasEnquiry: boolean;
  onSavedChange: (saved: boolean) => void;
  onEnquirySent: (message: string) => void;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [enquirySent, setEnquirySent] = useState(hasEnquiry);

  async function toggleSaved() {
    setError("");
    try {
      const response = await fetch(`/api/rentals/${listing.id}/save`, {
        method: saved ? "DELETE" : "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not update your saved homes.");
        return;
      }
      setSaved(result.saved);
      onSavedChange(result.saved);
    } catch {
      setError("Could not update your saved homes. Check your connection.");
    }
  }

  async function sendEnquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSending(true);
    try {
      const response = await fetch(`/api/rentals/${listing.id}/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Your message could not be sent.");
        return;
      }
      setMessage("");
      setEnquirySent(true);
      onEnquirySent(message);
    } catch {
      setError("Your message could not be sent. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  return (
    <article className="rental-card">
      <div className="rental-card-image">
        {listing.imageUrls[0] ? (
          <Image
            src={listing.imageUrls[0]}
            alt={`Rental in ${listing.neighborhood}, ${listing.town}`}
            fill
            sizes="(max-width: 700px) 90vw, (max-width: 1100px) 44vw, 30vw"
          />
        ) : (
          <div className="rental-image-placeholder" aria-hidden="true">
            <span>RENTFLOW</span>
            <strong>A place to make your own.</strong>
          </div>
        )}
        <button
          className={`save-home-button${saved ? " is-saved" : ""}`}
          type="button"
          aria-pressed={saved}
          onClick={toggleSaved}
        >
          {saved ? "Saved" : "Save home"}
        </button>
      </div>
      <div className="rental-card-body">
        <p className="rental-location">
          {listing.neighborhood} · {listing.town}, {listing.county}
        </p>
        <h2>{listing.title}</h2>
        <p className="rental-details">
          {listing.bedrooms} bedrooms · {listing.bathrooms} bathrooms
          {listing.furnished ? " · Furnished" : ""}
        </p>
        <p className="rental-price">
          <strong>{formatPrice(listing.price, listing.pricePeriod)}</strong>
        </p>
        {enquirySent ? (
          <p className="rental-enquiry-sent">You have contacted the landlord</p>
        ) : (
          <form className="rental-enquiry-form" onSubmit={sendEnquiry}>
            <label>
              <span>Ask about this home</span>
              <textarea
                maxLength={1500}
                minLength={10}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share a little about what you need and when you hope to move."
                required
                value={message}
              />
            </label>
            <button disabled={sending} type="submit">
              {sending ? "Sending…" : "Contact property manager"}
            </button>
          </form>
        )}
        {error ? (
          <p className="rental-action-message" role="status">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  );
}
