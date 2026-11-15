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

type PendingInvitation = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string;
  createdAt: string;
  expiresAt: string;
};

export function AdminDashboard({
  accounts,
  listings,
  invitations,
}: {
  accounts: AdminAccount[];
  listings: AdminListing[];
  invitations: PendingInvitation[];
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectingListing, setRejectingListing] = useState("");
  const [moderationNote, setModerationNote] = useState("");
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [retryingInvitation, setRetryingInvitation] = useState("");
  const router = useRouter();

  async function createOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCreatingOrganization(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = (await response.json()) as {
        error?: string;
        invitationId?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "The organization could not be created.");
        if (result.invitationId) router.refresh();
        return;
      }

      form.reset();
      setNotice("Organization created and owner invitation sent.");
      router.refresh();
    } catch {
      setError("The organization could not be created. Check your connection.");
    } finally {
      setCreatingOrganization(false);
    }
  }

  async function resendInvitation(invitationId: string) {
    setError("");
    setNotice("");
    setRetryingInvitation(invitationId);

    try {
      const response = await fetch(
        `/api/admin/organizations/invitations/${invitationId}/resend`,
        { method: "POST" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The invitation could not be resent.");
        return;
      }

      setNotice("Invitation email sent.");
      router.refresh();
    } catch {
      setError("The invitation could not be resent. Check your connection.");
    } finally {
      setRetryingInvitation("");
    }
  }

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
      <section className="admin-panel" id="organizations">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">PROPERTY PARTNER ONBOARDING</p>
            <h2>Create an organization</h2>
          </div>
        </div>
        <form className="admin-organization-form" onSubmit={createOrganization}>
          <label>
            Organization name
            <input maxLength={120} minLength={2} name="name" required />
          </label>
          <label>
            Organization slug
            <input
              autoComplete="off"
              maxLength={80}
              minLength={2}
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="example-properties"
              required
            />
          </label>
          <label>
            Owner first name
            <input maxLength={80} name="firstName" required />
          </label>
          <label>
            Owner last name
            <input maxLength={80} name="lastName" required />
          </label>
          <label>
            Owner email
            <input
              autoComplete="email"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </label>
          <button disabled={creatingOrganization} type="submit">
            {creatingOrganization ? "Creating..." : "Create and invite owner"}
          </button>
        </form>
        <p className="admin-empty">
          The owner receives a one-time link to create their account. Links are
          valid for seven days.
        </p>
      </section>

      <section
        className="admin-panel"
        aria-label="Pending organization invitations"
      >
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">OWNER SETUP</p>
            <h2>Pending invitations</h2>
          </div>
          <span>{invitations.length} pending</span>
        </div>
        {invitations.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Owner</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>{invitation.organization}</td>
                    <td>
                      <strong>
                        {invitation.firstName} {invitation.lastName}
                      </strong>
                      <small>{invitation.email}</small>
                    </td>
                    <td>
                      {new Date(invitation.expiresAt).toLocaleDateString(
                        "en-KE",
                      )}
                    </td>
                    <td>
                      <button
                        disabled={retryingInvitation === invitation.id}
                        onClick={() => resendInvitation(invitation.id)}
                        type="button"
                      >
                        {retryingInvitation === invitation.id
                          ? "Sending..."
                          : "Resend invitation"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No pending owner invitations.</p>
        )}
      </section>

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
