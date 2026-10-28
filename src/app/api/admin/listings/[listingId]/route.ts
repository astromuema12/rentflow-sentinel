import {
  authorizationErrorResponse,
  requirePlatformAdmin,
} from "@/lib/auth/authorization";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { adminListingReviewSchema } from "@/lib/rental-validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const admin = await requirePlatformAdmin();
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const parsed = adminListingReviewSchema.safeParse(body.data);
    if (!parsed.success) {
      return Response.json(
        { error: "Choose an allowed listing status." },
        { status: 400 },
      );
    }
    const { listingId } = await params;
    const updated = await getPrisma().$transaction(async (transaction) => {
      const listing = await transaction.rentalListing.findUnique({
        where: { id: listingId },
        select: { organizationId: true, status: true, updatedAt: true },
      });
      if (!listing) return "not-found";

      const result = await transaction.rentalListing.updateMany({
        where: { id: listingId, updatedAt: listing.updatedAt },
        data: {
          status: parsed.data.status,
          moderationNote: parsed.data.moderationNote ?? null,
          reviewedById: admin.id,
          publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
        },
      });
      if (!result.count) return "changed";
      await transaction.auditEvent.create({
        data: {
          organizationId: listing.organizationId,
          actorId: admin.id,
          action: "UPDATE",
          entityType: "RentalListing",
          entityId: listingId,
          metadata: {
            previousStatus: listing.status,
            status: parsed.data.status,
            moderationNote: parsed.data.moderationNote ?? null,
          },
        },
      });
      return "updated";
    });
    if (updated === "not-found") {
      return Response.json({ error: "Rental not found." }, { status: 404 });
    }
    if (updated === "changed") {
      return Response.json(
        { error: "The listing changed during review. Refresh and retry." },
        { status: 409 },
      );
    }
    return Response.json({ updated: true });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
