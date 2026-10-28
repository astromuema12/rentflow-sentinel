import {
  authorizationErrorResponse,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { rentalListingInputSchema } from "@/lib/rental-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const { organizationId } = await params;
    const landlord = await requireOrganizationAccess(
      organizationId,
      "OPERATOR",
    );
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const parsed = rentalListingInputSchema.safeParse(body.data);
    if (!parsed.success) {
      return Response.json(
        { error: "Check the rental details and try again." },
        { status: 400 },
      );
    }

    const listing = await getPrisma().rentalListing.create({
      data: {
        ...parsed.data,
        organizationId,
        createdById: landlord.id,
        status: "PENDING_REVIEW",
      },
      select: { id: true },
    });
    return Response.json({ listingId: listing.id }, { status: 201 });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
