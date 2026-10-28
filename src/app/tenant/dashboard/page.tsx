import { redirect } from "next/navigation";
import Link from "next/link";
import { RentFlowLogo } from "@/components/rentflow-logo";
import { AuthorizationError, requireRenter } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import { TenantRentals } from "../tenant-rentals";
import type { RentalCardListing } from "../rental-types";
import "../rental-dashboard.css";

export default async function TenantDashboardPage() {
  let renter;
  try {
    renter = await requireRenter();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect(error.status === 401 ? "/sign-in" : "/dashboard");
    }
    throw error;
  }

  const prisma = getPrisma();
  const [listings, saved, enquiries] = await Promise.all([
    prisma.rentalListing.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        county: true,
        town: true,
        neighborhood: true,
        price: true,
        pricePeriod: true,
        bedrooms: true,
        bathrooms: true,
        furnished: true,
        imageUrls: true,
      },
    }),
    prisma.savedRentalListing.findMany({
      where: { userId: renter.id, listing: { status: "PUBLISHED" } },
      select: { listingId: true },
    }),
    prisma.rentalEnquiry.findMany({
      where: { renterId: renter.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        listingId: true,
        message: true,
        response: true,
        status: true,
        createdAt: true,
        listing: {
          select: { title: true, town: true, county: true },
        },
      },
    }),
  ]);
  const cards: RentalCardListing[] = listings.map((listing) => ({
    ...listing,
    price: listing.price.toString(),
  }));
  const savedListingIds = saved.map(({ listingId }) => listingId);

  return (
    <main className="rental-dashboard-page">
      <header className="rental-dashboard-header">
        <Link className="market-brand" href="/" aria-label="RentFlow home">
          <RentFlowLogo />
        </Link>
        <SignOutButton />
      </header>
      <section className="rental-dashboard-topline">
        <div>
          <p className="market-kicker">YOUR RENTAL SEARCH</p>
          <h1>Find a place that feels like yours.</h1>
          <p>
            Browse homes cleared for RentFlow, compare the details, and save
            your favourites for later.
          </p>
        </div>
      </section>
      <div className="tenant-dashboard-container">
        <TenantRentals
          enquiries={enquiries.map((enquiry) => ({
            ...enquiry,
            createdAt: enquiry.createdAt.toISOString(),
          }))}
          listings={cards}
          savedListingIds={savedListingIds}
        />
      </div>
    </main>
  );
}
