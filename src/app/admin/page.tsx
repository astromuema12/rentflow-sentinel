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
  ]);

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
        ].map(([label, count]) => (
          <article className="admin-metric" key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </article>
        ))}
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
