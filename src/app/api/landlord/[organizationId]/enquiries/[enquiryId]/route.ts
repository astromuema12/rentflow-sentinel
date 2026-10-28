import {
  authorizationErrorResponse,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { rentalEnquiryResponseSchema } from "@/lib/rental-validation";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ organizationId: string; enquiryId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const { organizationId, enquiryId } = await params;
    await requireOrganizationAccess(organizationId, "OPERATOR");
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const parsed = rentalEnquiryResponseSchema.safeParse(body.data);
    if (!parsed.success) {
      return Response.json(
        { error: "Enter a response of at least two characters." },
        { status: 400 },
      );
    }

    const updated = await getPrisma().rentalEnquiry.updateMany({
      where: { id: enquiryId, listing: { organizationId } },
      data: {
        response: parsed.data.response,
        status: "RESPONDED",
        respondedAt: new Date(),
      },
    });
    if (!updated.count) {
      return Response.json({ error: "Enquiry not found." }, { status: 404 });
    }
    return Response.json({ responded: true });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
