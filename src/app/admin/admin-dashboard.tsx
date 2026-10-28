"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminAccount = {
  id: string;
  email: string;
  name: string;
  accountType: string;
  isActive: boolean;
  createdAt: string;
};

type AdminListing = {
  id: string;
  title: string;
  county: string;
  town: string;
  neighborhood: string;
  price: string;
  pricePeriod: "MONTHLY" | "NIGHTLY";
  status: string;
  organization: string;
  createdBy: string;
  savedCount: number;
  enquiryCount: number;
};

export function AdminDashboard({
  accounts,
  listings,
}: {
  accounts: AdminAccount[];
  listings: AdminListing[];
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectingListing, setRejectingListing] = useState("");
  const [moderationNote, setModerationNote] = useState("");
  const router = useRouter();

  async function setAccountActive(userId: string, isActive: boolean) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The account status could not be updated.");
        return;
      }
      setNotice("Account status updated. Existing sessions have been revoked.");
      router.refresh();
    } catch {
      setError(
        "The account status could not be updated. Check your connection.",
      );
    }
  }

  async function reviewListing(listingId: string, status: string, reason = "") {
    setError("");
    setNotice("");
    if (status === "REJECTED" && reason.trim().length < 2) {
      setError("A short reason is required when rejecting a listing.");
      return;
    }
    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, moderationNote: reason }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "The listing could not be reviewed.");
        return;
      }
      setNotice("Listing review saved.");
      setRejectingListing("");
      setModerationNote("");
      router.refresh();
    } catch {
      setError("The listing could not be reviewed. Check your connection.");
    }
  }

  return (
    <div className="admin-dashboard-content">
      {error ? (
        <p className="admin-message is-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="admin-message" role="status">
          {notice}
        </p>
      ) : null}
      <section className="admin-panel" id="listings">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">MARKETPLACE OVERSIGHT</p>
            <h2>Rental listings</h2>
          </div>
          <span>{listings.length} recent</span>
        </div>
        {listings.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rental</th>
                  <th>Property organization</th>
                  <th>Manager</th>
                  <th>Performance</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <strong>{listing.title}</strong>
                      <small>
                        {listing.neighborhood} · {listing.town},{" "}
                        {listing.county}
                      </small>
                      <small>
                        KES {Number(listing.price).toLocaleString("en-KE")} /{" "}
                        {listing.pricePeriod === "MONTHLY" ? "month" : "night"}
                      </small>
                    </td>
                    <td>{listing.organization}</td>
                    <td>{listing.createdBy}</td>
                    <td>
                      {listing.savedCount} saves · {listing.enquiryCount}{" "}
                      enquiries
                    </td>
                    <td>
                      <span
                        className={`listing-status listing-status--${listing.status.toLowerCase()}`}
                      >
                        {listing.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        {listing.status === "REJECTED" ? (
                          <button
                            onClick={() =>
                              reviewListing(listing.id, "PENDING_REVIEW")
                            }
                            type="button"
                          >
                            Reopen
                          </button>
                        ) : listing.status !== "PUBLISHED" ? (
                          <button
                            onClick={() =>
                              reviewListing(listing.id, "PUBLISHED")
                            }
                            type="button"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => reviewListing(listing.id, "PAUSED")}
                            type="button"
                          >
                            Pause
                          </button>
                        )}
                        {listing.status !== "REJECTED" ? (
                          <button
                            className="admin-action-danger"
                            onClick={() => {
                              setRejectingListing(listing.id);
                              setModerationNote("");
                            }}
                            type="button"
                          >
                            Reject
                          </button>
                        ) : null}
                      </div>
                      {rejectingListing === listing.id ? (
                        <form
                          className="admin-rejection-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void reviewListing(
                              listing.id,
                              "REJECTED",
                              moderationNote,
                            );
                          }}
                        >
                          <label>
                            Reason for the property manager
                            <input
                              maxLength={500}
                              minLength={2}
                              onChange={(event) =>
                                setModerationNote(event.target.value)
                              }
                              required
                              value={moderationNote}
                            />
                          </label>
                          <button type="submit">Confirm rejection</button>
                          <button
                            onClick={() => setRejectingListing("")}
                            type="button"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">
            No rental listings have been submitted yet.
          </p>
        )}
      </section>

      <section className="admin-panel" id="accounts">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">PEOPLE & ACCESS</p>
            <h2>Accounts</h2>
          </div>
          <span>{accounts.length} recent</span>
        </div>
        {accounts.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name || "Name not provided"}</strong>
                      <small>{account.email}</small>
                    </td>
                    <td>{account.accountType.replaceAll("_", " ")}</td>
                    <td>
                      {new Date(account.createdAt).toLocaleDateString("en-KE")}
                    </td>
                    <td>{account.isActive ? "Active" : "Suspended"}</td>
                    <td>
                      {account.accountType === "PLATFORM_ADMIN" ? (
                        <span className="admin-protected-account">
                          Protected admin
                        </span>
                      ) : (
                        <button
                          className={
                            account.isActive ? "admin-action-danger" : ""
                          }
                          onClick={() =>
                            setAccountActive(account.id, !account.isActive)
                          }
                          type="button"
                        >
                          {account.isActive ? "Suspend" : "Reactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No accounts are available to manage.</p>
        )}
      </section>
    </div>
  );
}
