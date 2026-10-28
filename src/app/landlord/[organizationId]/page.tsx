import { redirect } from "next/navigation";
import {
  AuthorizationError,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import { LandlordPortal } from "../landlord-portal";

export default async function LandlordDashboardPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  let access;
  try {
    access = await requireOrganizationAccess(organizationId, "OPERATOR");
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) {
      redirect("/sign-in");
    }
    throw error;
  }

  const listings = await getPrisma().rentalListing.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      county: true,
      town: true,
      neighborhood: true,
      price: true,
      pricePeriod: true,
      bedrooms: true,
      bathrooms: true,
      furnished: true,
      status: true,
      moderationNote: true,
      createdAt: true,
      _count: { select: { savedBy: true } },
      enquiries: {
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          message: true,
          response: true,
          status: true,
          createdAt: true,
          renter: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  return (
    <div className="workspace-page landlord-workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">LANDLORD DASHBOARD</p>
          <h1>Manage your rentals</h1>
          <p className="page-subtitle">
            Keep listings accurate, respond to renters, and see how your
            properties are performing.
          </p>
        </div>
      </header>
      <LandlordPortal
        canManage={access.role !== "VIEWER"}
        listings={listings.map((listing) => ({
          ...listing,
          price: listing.price.toString(),
          createdAt: listing.createdAt.toISOString(),
          saves: listing._count.savedBy,
          enquiries: listing.enquiries.map((enquiry) => ({
            ...enquiry,
            createdAt: enquiry.createdAt.toISOString(),
          })),
        }))}
        organizationId={organizationId}
      />
    </div>
  );
}
