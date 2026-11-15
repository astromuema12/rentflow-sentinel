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
  organizationIsActive: boolean;
  createdAt: string;
  expiresAt: string;
};

type AdminOrganization = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
  members: {
    id: string;
    userId: string;
    email: string;
    name: string;
    accountType: string;
    role: string;
  }[];
};

type AdminAuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: string;
  occurredAt: string;
  actor: string;
  organization: string;
};

export function AdminDashboard({
  accounts,
  listings,
  invitations,
  organizations,
  auditEvents,
}: {
  accounts: AdminAccount[];
  listings: AdminListing[];
  invitations: PendingInvitation[];
  organizations: AdminOrganization[];
  auditEvents: AdminAuditEvent[];
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rejectingListing, setRejectingListing] = useState("");
  const [moderationNote, setModerationNote] = useState("");
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [retryingInvitation, setRetryingInvitation] = useState("");
  const [savingOrganization, setSavingOrganization] = useState("");
  const [savingMembership, setSavingMembership] = useState("");
  const [confirmingOrganization, setConfirmingOrganization] = useState("");
  const [confirmingMembership, setConfirmingMembership] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("ALL");
  const [accountStatusFilter, setAccountStatusFilter] = useState("ALL");
  const [listingSearch, setListingSearch] = useState("");
  const [listingStatusFilter, setListingStatusFilter] = useState("ALL");
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [organizationStatusFilter, setOrganizationStatusFilter] =
    useState("ALL");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const router = useRouter();

  const visibleAccounts = accounts.filter((account) => {
    const matchesSearch = `${account.name} ${account.email}`
      .toLowerCase()
      .includes(accountSearch.trim().toLowerCase());
    const matchesType =
      accountTypeFilter === "ALL" || account.accountType === accountTypeFilter;
    const matchesStatus =
      accountStatusFilter === "ALL" ||
      account.isActive === (accountStatusFilter === "ACTIVE");
    return matchesSearch && matchesType && matchesStatus;
  });
  const visibleListings = listings.filter((listing) => {
    const matchesSearch =
      `${listing.title} ${listing.organization} ${listing.createdBy} ${listing.county} ${listing.town}`
        .toLowerCase()
        .includes(listingSearch.trim().toLowerCase());
    return (
      matchesSearch &&
      (listingStatusFilter === "ALL" || listing.status === listingStatusFilter)
    );
  });
  const visibleOrganizations = organizations.filter(
    (organization) =>
      `${organization.name} ${organization.slug}`
        .toLowerCase()
        .includes(organizationSearch.trim().toLowerCase()) &&
      (organizationStatusFilter === "ALL" ||
        organization.isActive === (organizationStatusFilter === "ACTIVE")),
  );
  const visibleAuditEvents = auditEvents.filter((event) => {
    const matchesSearch =
      `${event.action} ${event.entityType} ${event.entityId ?? ""} ${event.actor} ${event.organization} ${event.metadata}`
        .toLowerCase()
        .includes(auditSearch.trim().toLowerCase());
    return (
      matchesSearch &&
      (auditActionFilter === "ALL" || event.action === auditActionFilter)
    );
  });

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

  async function updateOrganization(
    organizationId: string,
    updates: { name?: string; slug?: string; isActive?: boolean },
  ) {
    setError("");
    setNotice("");
    setSavingOrganization(organizationId);
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The organization could not be updated.");
        return;
      }
      setNotice("Organization updated.");
      router.refresh();
    } catch {
      setError("The organization could not be updated. Check your connection.");
    } finally {
      setSavingOrganization("");
    }
  }

  async function updateMembership(
    organizationId: string,
    membershipId: string,
    role: string,
  ) {
    setError("");
    setNotice("");
    setSavingMembership(membershipId);
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationId}/memberships/${membershipId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The member role could not be updated.");
        return;
      }
      setNotice("Organization member role updated.");
      router.refresh();
    } catch {
      setError("The member role could not be updated. Check your connection.");
    } finally {
      setSavingMembership("");
    }
  }

  async function addOrganizationMember(
    event: React.FormEvent<HTMLFormElement>,
    organizationId: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError("");
    setNotice("");
    setSavingMembership(`add-${organizationId}`);
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationId}/memberships`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(formData.entries())),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The member could not be added.");
        return;
      }
      form.reset();
      setNotice("Landlord added to the organization.");
      router.refresh();
    } catch {
      setError("The member could not be added. Check your connection.");
    } finally {
      setSavingMembership("");
    }
  }

  async function removeOrganizationMember(
    organizationId: string,
    membershipId: string,
  ) {
    setError("");
    setNotice("");
    setSavingMembership(membershipId);
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationId}/memberships/${membershipId}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The member could not be removed.");
        return;
      }
      setNotice("Member access removed from the organization.");
      router.refresh();
    } catch {
      setError("The member could not be removed. Check your connection.");
    } finally {
      setSavingMembership("");
      setConfirmingMembership("");
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
      <section className="admin-panel" id="create-organization">
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
                      {!invitation.organizationIsActive ? (
                        <small>Organization suspended</small>
                      ) : null}
                    </td>
                    <td>
                      {new Date(invitation.expiresAt).toLocaleDateString(
                        "en-KE",
                      )}
                    </td>
                    <td>
                      <button
                        disabled={
                          retryingInvitation === invitation.id ||
                          !invitation.organizationIsActive
                        }
                        onClick={() => resendInvitation(invitation.id)}
                        type="button"
                      >
                        {retryingInvitation === invitation.id
                          ? "Sending..."
                          : invitation.organizationIsActive
                            ? "Resend invitation"
                            : "Reactivate organization first"}
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

      <section className="admin-panel" id="organizations">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">ORGANIZATION OPERATIONS</p>
            <h2>Organizations</h2>
          </div>
          <span>{organizations.length} recent</span>
        </div>
        <label className="admin-search-field">
          Search organizations
          <input
            onChange={(event) => setOrganizationSearch(event.target.value)}
            placeholder="Name or slug"
            value={organizationSearch}
          />
        </label>
        <label className="admin-search-field">
          Organization status
          <select
            onChange={(event) =>
              setOrganizationStatusFilter(event.target.value)
            }
            value={organizationStatusFilter}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </label>
        <p className="admin-results-count">
          Showing {visibleOrganizations.length} of {organizations.length} recent
          organizations
        </p>
        {visibleOrganizations.length ? (
          <div className="admin-organization-list">
            {visibleOrganizations.map((organization) => (
              <article
                className="admin-organization-card"
                key={organization.id}
              >
                <div className="admin-organization-heading">
                  <div>
                    <h3>{organization.name}</h3>
                    <p>
                      /{organization.slug} · {organization.members.length} of{" "}
                      {organization.memberCount} members ·{" "}
                      {organization.isActive ? "Active" : "Suspended"}
                    </p>
                  </div>
                  <button
                    className={
                      organization.isActive ? "admin-action-danger" : ""
                    }
                    disabled={savingOrganization === organization.id}
                    onClick={() => {
                      if (organization.isActive) {
                        setConfirmingOrganization(organization.id);
                      } else {
                        void updateOrganization(organization.id, {
                          isActive: true,
                        });
                      }
                    }}
                    type="button"
                  >
                    {organization.isActive
                      ? "Suspend organization"
                      : "Reactivate organization"}
                  </button>
                </div>
                {confirmingOrganization === organization.id ? (
                  <div
                    className="admin-suspension-confirmation"
                    role="group"
                    aria-label={`Confirm suspension of ${organization.name}`}
                  >
                    <p>
                      Suspending this organization blocks its members from all
                      workspaces and prevents new invitation acceptance.
                    </p>
                    <button
                      className="admin-action-danger"
                      disabled={savingOrganization === organization.id}
                      onClick={() => {
                        setConfirmingOrganization("");
                        void updateOrganization(organization.id, {
                          isActive: false,
                        });
                      }}
                      type="button"
                    >
                      Confirm suspension
                    </button>
                    <button
                      disabled={savingOrganization === organization.id}
                      onClick={() => setConfirmingOrganization("")}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
                <details>
                  <summary>Edit organization and members</summary>
                  <form
                    className="admin-organization-edit-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      void updateOrganization(organization.id, {
                        name: String(formData.get("name") ?? ""),
                        slug: String(formData.get("slug") ?? ""),
                      });
                    }}
                  >
                    <label>
                      Organization name
                      <input
                        defaultValue={organization.name}
                        maxLength={120}
                        minLength={2}
                        name="name"
                        required
                      />
                    </label>
                    <label>
                      Organization slug
                      <input
                        defaultValue={organization.slug}
                        maxLength={80}
                        minLength={2}
                        name="slug"
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        required
                      />
                    </label>
                    <button
                      disabled={savingOrganization === organization.id}
                      type="submit"
                    >
                      Save organization
                    </button>
                  </form>
                  <form
                    className="admin-add-member-form"
                    onSubmit={(event) =>
                      void addOrganizationMember(event, organization.id)
                    }
                  >
                    <label>
                      Add existing landlord
                      <input
                        autoComplete="email"
                        disabled={!organization.isActive}
                        maxLength={254}
                        name="email"
                        required
                        type="email"
                      />
                    </label>
                    <label>
                      Initial role
                      <select
                        defaultValue="OPERATOR"
                        disabled={!organization.isActive}
                        name="role"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="OPERATOR">Operator</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </label>
                    <button
                      disabled={
                        !organization.isActive ||
                        savingMembership === `add-${organization.id}`
                      }
                      type="submit"
                    >
                      Add member
                    </button>
                  </form>
                  <p className="admin-results-count">
                    Only active landlord accounts can be added.
                  </p>
                  <h4>Organization members</h4>
                  {organization.members.length ? (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {organization.members.map((member) => (
                            <tr key={member.id}>
                              <td>{member.name || "Name not provided"}</td>
                              <td>{member.email}</td>
                              <td>{member.role.replaceAll("_", " ")}</td>
                              <td>
                                {member.role === "OWNER" ||
                                member.accountType !== "LANDLORD" ? (
                                  <span className="admin-protected-account">
                                    {member.role === "OWNER"
                                      ? "Owner role protected"
                                      : "Non-landlord role protected"}
                                  </span>
                                ) : confirmingMembership === member.id ? (
                                  <div className="admin-membership-confirmation">
                                    <span>Remove this member’s access?</span>
                                    <button
                                      className="admin-action-danger"
                                      disabled={savingMembership === member.id}
                                      onClick={() =>
                                        void removeOrganizationMember(
                                          organization.id,
                                          member.id,
                                        )
                                      }
                                      type="button"
                                    >
                                      Confirm remove
                                    </button>
                                    <button
                                      disabled={savingMembership === member.id}
                                      onClick={() =>
                                        setConfirmingMembership("")
                                      }
                                      type="button"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <form
                                    className="admin-membership-form"
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      const formData = new FormData(
                                        event.currentTarget,
                                      );
                                      void updateMembership(
                                        organization.id,
                                        member.id,
                                        String(formData.get("role") ?? ""),
                                      );
                                    }}
                                  >
                                    <select
                                      aria-label={`Role for ${member.email}`}
                                      defaultValue={member.role}
                                      name="role"
                                    >
                                      <option value="ADMIN">Admin</option>
                                      <option value="OPERATOR">Operator</option>
                                      <option value="VIEWER">Viewer</option>
                                    </select>
                                    <button
                                      disabled={savingMembership === member.id}
                                      type="submit"
                                    >
                                      Save role
                                    </button>
                                    <button
                                      className="admin-action-danger"
                                      disabled={savingMembership === member.id}
                                      onClick={() =>
                                        setConfirmingMembership(member.id)
                                      }
                                      type="button"
                                    >
                                      Remove
                                    </button>
                                  </form>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="admin-empty">No members are assigned.</p>
                  )}
                  {organization.members.length < organization.memberCount ? (
                    <p className="admin-results-count">
                      Showing the first {organization.members.length} of{" "}
                      {organization.memberCount} members.
                    </p>
                  ) : null}
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty">No organizations match this search.</p>
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
        <div className="admin-filter-row">
          <label>
            Search listings
            <input
              onChange={(event) => setListingSearch(event.target.value)}
              placeholder="Title, organization, manager, county"
              value={listingSearch}
            />
          </label>
          <label>
            Listing status
            <select
              onChange={(event) => setListingStatusFilter(event.target.value)}
              value={listingStatusFilter}
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING_REVIEW">Awaiting review</option>
              <option value="PUBLISHED">Published</option>
              <option value="PAUSED">Paused</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>
          </label>
        </div>
        <p className="admin-results-count">
          Showing {visibleListings.length} of {listings.length} recent listings
        </p>
        {visibleListings.length ? (
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
                {visibleListings.map((listing) => (
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
          <p className="admin-empty">No listings match these filters.</p>
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
        <div className="admin-filter-row">
          <label>
            Search accounts
            <input
              onChange={(event) => setAccountSearch(event.target.value)}
              placeholder="Name or email"
              value={accountSearch}
            />
          </label>
          <label>
            Account type
            <select
              onChange={(event) => setAccountTypeFilter(event.target.value)}
              value={accountTypeFilter}
            >
              <option value="ALL">All account types</option>
              <option value="RENTER">Renter</option>
              <option value="LANDLORD">Landlord</option>
              <option value="PLATFORM_ADMIN">Platform admin</option>
            </select>
          </label>
          <label>
            Account status
            <select
              onChange={(event) => setAccountStatusFilter(event.target.value)}
              value={accountStatusFilter}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
        </div>
        <p className="admin-results-count">
          Showing {visibleAccounts.length} of {accounts.length} recent accounts
        </p>
        {visibleAccounts.length ? (
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
                {visibleAccounts.map((account) => (
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
          <p className="admin-empty">No accounts match these filters.</p>
        )}
      </section>

      <section className="admin-panel" id="audit">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">ACCOUNTABILITY</p>
            <h2>Audit history</h2>
          </div>
          <span>{auditEvents.length} recent events</span>
        </div>
        <div className="admin-filter-row">
          <label>
            Search audit history
            <input
              onChange={(event) => setAuditSearch(event.target.value)}
              placeholder="Actor, organization, action, entity"
              value={auditSearch}
            />
          </label>
          <label>
            Audit action
            <select
              onChange={(event) => setAuditActionFilter(event.target.value)}
              value={auditActionFilter}
            >
              <option value="ALL">All actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="REVIEW">Review</option>
              <option value="ACCESS_DENIED">Access denied</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </label>
        </div>
        <p className="admin-results-count">
          Showing {visibleAuditEvents.length} of {auditEvents.length} recent
          events
        </p>
        {visibleAuditEvents.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Organization</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleAuditEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      {new Date(event.occurredAt).toLocaleString("en-KE")}
                    </td>
                    <td>{event.actor}</td>
                    <td>{event.organization || "Platform"}</td>
                    <td>{event.action.replaceAll("_", " ")}</td>
                    <td>
                      {event.entityType}
                      {event.entityId ? <small>{event.entityId}</small> : null}
                    </td>
                    <td>
                      {event.metadata ? (
                        <details className="admin-audit-details">
                          <summary>View details</summary>
                          <code>{event.metadata}</code>
                        </details>
                      ) : (
                        <span className="admin-protected-account">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No audit events match these filters.</p>
        )}
      </section>
    </div>
  );
}
