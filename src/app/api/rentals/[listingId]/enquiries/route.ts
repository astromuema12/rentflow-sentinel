import { Prisma } from "@prisma/client";
import {
  authorizationErrorResponse,
  requireRenter,
} from "@/lib/auth/authorization";
import { consumeRateLimit, createRateLimitKey } from "@/lib/auth/rate-limit";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { rentalEnquiryInputSchema } from "@/lib/rental-validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const renter = await requireRenter();
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const payload = rentalEnquiryInputSchema.safeParse(body.data);
    if (!payload.success) {
      return Response.json(
        { error: "Enter a message between 10 and 1,500 characters." },
        { status: 400 },
      );
    }

    const { listingId } = await params;
    const prisma = getPrisma();
    const listing = await prisma.rentalListing.findFirst({
      where: { id: listingId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!listing) {
      return Response.json({ error: "Rental not found." }, { status: 404 });
    }
    const withinLimit = await consumeRateLimit(
      createRateLimitKey("rental-enquiry", renter.id),
      10,
      60 * 60 * 1000,
    );
    if (!withinLimit) {
      return Response.json(
        { error: "You have sent several enquiries recently. Try again later." },
        { status: 429 },
      );
    }

    await prisma.rentalEnquiry.create({
      data: { listingId, renterId: renter.id, message: payload.data.message },
    });
    return Response.json({ sent: true }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "You have already contacted the landlord about this home." },
        { status: 409 },
      );
    }
    return authorizationErrorResponse(error);
  }
}
