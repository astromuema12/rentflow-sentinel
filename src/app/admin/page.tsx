import { redirect } from "next/navigation";
import Link from "next/link";
import { RentFlowLogo } from "@/components/rentflow-logo";
import {
  AuthorizationError,
  requirePlatformAdmin,
} from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { AdminDashboard } from "./admin-dashboard";
import "./admin.css";

export default async function PlatformAdminPage() {
  try {
    await requirePlatformAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect(error.status === 401 ? "/sign-in" : "/dashboard");
    }
    throw error;
  }

  const prisma = getPrisma();
  const [
    accounts,
    listings,
    userCount,
    renterCount,
    landlordCount,
    publishedCount,
    reviewCount,
    organizationCount,
    savedPropertyCount,
    enquiryStatusGroups,
    respondedEnquiryCount,
    revenueGroups,
    listingStatusGroups,
    countyGroups,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accountType: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.rentalListing.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        county: true,
        town: true,
        neighborhood: true,
        price: true,
        pricePeriod: true,
        status: true,
        organization: { select: { name: true } },
        createdBy: { select: { email: true } },
        _count: { select: { savedBy: true, enquiries: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { accountType: "RENTER" } }),
    prisma.user.count({ where: { accountType: "LANDLORD" } }),
    prisma.rentalListing.count({ where: { status: "PUBLISHED" } }),
    prisma.rentalListing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.organization.count(),
    prisma.savedRentalListing.count(),
    prisma.rentalEnquiry.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.rentalEnquiry.count({
      where: { respondedAt: { not: null } },
    }),
    prisma.normalizedTransaction.groupBy({
      by: ["currency", "type"],
      _sum: { amount: true },
    }),
    prisma.rentalListing.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.rentalListing.groupBy({
      by: ["county"],
      _count: { _all: true },
    }),
  ]);
  const enquiryCount = enquiryStatusGroups.reduce(
    (total, group) => total + (group._count?._all ?? 0),
    0,
  );
  const responseRate = enquiryCount
    ? Math.round((respondedEnquiryCount / enquiryCount) * 100)
    : 0;
  const topCounties = [...countyGroups]
    .sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0))
    .slice(0, 5);
  const currencyTotals = [
    ...new Set(revenueGroups.map((group) => group.currency)),
  ]
    .sort()
    .map((currency) => ({
      currency,
      credits:
        revenueGroups
          .find(
            (group) => group.currency === currency && group.type === "CREDIT",
          )
          ?._sum.amount?.toString() ?? "0",
      debits:
        revenueGroups
          .find(
            (group) => group.currency === currency && group.type === "DEBIT",
          )
          ?._sum.amount?.toString() ?? "0",
    }));

  return (
    <main className="admin-dashboard-page">
      <header className="admin-dashboard-header">
        <Link className="market-brand" href="/" aria-label="RentFlow home">
          <RentFlowLogo label="PLATFORM ADMIN" />
        </Link>
        <SignOutButton />
      </header>
      <section className="admin-dashboard-heading">
        <p className="eyebrow">SITE MANAGEMENT</p>
        <h1>RentFlow administration</h1>
        <p>
          Manage platform accounts, review rental listings, and keep the
          marketplace trustworthy.
        </p>
      </section>
      <section className="admin-metric-grid" aria-label="Platform overview">
        {[
          ["All accounts", userCount],
          ["Renter accounts", renterCount],
          ["Property partners", landlordCount],
          ["Published homes", publishedCount],
          ["Awaiting review", reviewCount],
          ["Organizations", organizationCount],
        ].map(([label, count]) => (
          <article className="admin-metric" key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </article>
        ))}
      </section>
      <section className="admin-panel" aria-label="Platform analytics">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">PLATFORM ANALYTICS</p>
            <h2>Marketplace performance</h2>
          </div>
          <span>All time</span>
        </div>
        <div className="admin-analytics-grid">
          <article className="admin-metric">
            <span>Renter enquiries</span>
            <strong>{enquiryCount}</strong>
          </article>
          <article className="admin-metric">
            <span>Enquiries responded</span>
            <strong>{responseRate}%</strong>
          </article>
          <article className="admin-metric">
            <span>Published listings</span>
            <strong>
              {listingStatusGroups.find((group) => group.status === "PUBLISHED")
                ?._count?._all ?? 0}
            </strong>
          </article>
          <article className="admin-metric">
            <span>Saved properties</span>
            <strong>{savedPropertyCount}</strong>
          </article>
        </div>
        <div className="admin-analytics-columns">
          <div>
            <h3>Top counties by listings</h3>
            {topCounties.length ? (
              <ul className="admin-analytics-list">
                {topCounties.map((group) => (
                  <li key={group.county}>
                    <span>{group.county}</span>
                    <strong>{group._count?._all ?? 0}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-empty">No listing activity yet.</p>
            )}
          </div>
          <div>
            <h3>Recorded transaction totals</h3>
            {currencyTotals.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Currency</th>
                      <th>Credits</th>
                      <th>Debits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currencyTotals.map((total) => (
                      <tr key={total.currency}>
                        <td>{total.currency}</td>
                        <td>{Number(total.credits).toLocaleString("en-KE")}</td>
                        <td>{Number(total.debits).toLocaleString("en-KE")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="admin-empty">No transaction activity yet.</p>
            )}
          </div>
        </div>
      </section>
      <AdminDashboard
        accounts={accounts.map((account) => ({
          id: account.id,
          email: account.email,
          name: [account.firstName, account.lastName].filter(Boolean).join(" "),
          accountType: account.accountType,
          isActive: account.isActive,
          createdAt: account.createdAt.toISOString(),
        }))}
        listings={listings.map((listing) => ({
          id: listing.id,
          title: listing.title,
          county: listing.county,
          town: listing.town,
          neighborhood: listing.neighborhood,
          price: listing.price.toString(),
          pricePeriod: listing.pricePeriod,
          status: listing.status,
          organization: listing.organization.name,
          createdBy: listing.createdBy.email,
          savedCount: listing._count.savedBy,
          enquiryCount: listing._count.enquiries,
        }))}
      />
    </main>
  );
}
