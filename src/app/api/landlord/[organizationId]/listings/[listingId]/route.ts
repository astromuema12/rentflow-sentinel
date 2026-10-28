import { RentalListingStatus } from "@prisma/client";
import {
  authorizationErrorResponse,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import {
  landlordListingStatusSchema,
  rentalListingInputSchema,
} from "@/lib/rental-validation";

const landlordListingUpdateSchema = rentalListingInputSchema
  .partial()
  .extend({ status: landlordListingStatusSchema.shape.status.optional() });

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ organizationId: string; listingId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const { organizationId, listingId } = await params;
    await requireOrganizationAccess(organizationId, "OPERATOR");
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const parsed = landlordListingUpdateSchema.safeParse(body.data);
    if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      return Response.json(
        { error: "Check the rental details and try again." },
        { status: 400 },
      );
    }

    const listing = await getPrisma().rentalListing.findFirst({
      where: { id: listingId, organizationId },
      select: { id: true, status: true },
    });
    if (!listing) {
      return Response.json({ error: "Rental not found." }, { status: 404 });
    }
    if (listing.status === RentalListingStatus.REJECTED) {
      return Response.json(
        { error: "Rejected rentals must be reviewed by a platform admin." },
        { status: 409 },
      );
    }

    const { status, ...listingData } = parsed.data;
    const needsReview =
      listing.status === RentalListingStatus.PUBLISHED &&
      Object.keys(listingData).length > 0;
    const updated = await getPrisma().rentalListing.updateMany({
      where: { id: listingId, organizationId },
      data: {
        ...listingData,
        ...(status ? { status } : {}),
        ...(needsReview ? { status: RentalListingStatus.PENDING_REVIEW } : {}),
        ...(needsReview ? { publishedAt: null } : {}),
      },
    });
    return Response.json({ updated: updated.count === 1 });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
