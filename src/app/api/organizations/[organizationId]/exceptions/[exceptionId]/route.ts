import { MembershipRole } from "@prisma/client";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import {
  authorizationErrorResponse,
  AuthorizationError,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { isSameOriginRequest } from "@/lib/http";

const reviewSchema = z.object({
  status: z.enum(["RESOLVED", "IGNORED"]),
  reason: z.string().trim().min(5).max(1000),
});

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ organizationId: string; exceptionId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }
    const { organizationId, exceptionId } = await params;
    const actor = await requireOrganizationAccess(
      organizationId,
      MembershipRole.OPERATOR,
    );
    const body: unknown = await request.json().catch(() => null);
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success)
      return Response.json(
        {
          error:
            "Select a review status and enter a reason of at least 5 characters.",
        },
        { status: 400 },
      );

    const result = await getPrisma().$transaction(async (transaction) => {
      const updated = await transaction.reconciliationException.updateMany({
        where: { id: exceptionId, organizationId, status: "OPEN" },
        data: {
          status: parsed.data.status,
          resolutionNotes: parsed.data.reason,
        },
      });
      if (updated.count !== 1) return false;
      const exception = await transaction.reconciliationException.findFirst({
        where: { id: exceptionId, organizationId },
        select: { id: true, normalizedTransactionId: true },
      });
      if (!exception) return false;
      await transaction.humanReviewDecision.create({
        data: {
          organizationId,
          normalizedTransactionId: exception.normalizedTransactionId,
          reviewedById: actor.id,
          decisionType: "COMMENT",
          rationale: parsed.data.reason,
          decisionMetadata: { exceptionId, status: parsed.data.status },
        },
      });
      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorId: actor.id,
          action: "REVIEW",
          entityType: "ReconciliationException",
          entityId: exceptionId,
          metadata: { status: parsed.data.status, reason: parsed.data.reason },
        },
      });
      return true;
    });

    if (!result) throw new AuthorizationError(404);
    return Response.json(
      { id: exceptionId, status: parsed.data.status },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
