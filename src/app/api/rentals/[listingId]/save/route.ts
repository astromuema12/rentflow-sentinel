import {
  authorizationErrorResponse,
  requireRenter,
} from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import { isSameOriginRequest } from "@/lib/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const user = await requireRenter();
    const { listingId } = await params;
    const prisma = getPrisma();
    const listing = await prisma.rentalListing.findFirst({
      where: { id: listingId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!listing) {
      return Response.json({ error: "Rental not found." }, { status: 404 });
    }

    await prisma.savedRentalListing.upsert({
      where: { userId_listingId: { userId: user.id, listingId } },
      create: { userId: user.id, listingId },
      update: {},
    });
    return Response.json({ saved: true });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listingId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const user = await requireRenter();
    const { listingId } = await params;
    await getPrisma().savedRentalListing.deleteMany({
      where: {
        userId: user.id,
        listingId,
        listing: { status: "PUBLISHED" },
      },
    });
    return Response.json({ saved: false });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
