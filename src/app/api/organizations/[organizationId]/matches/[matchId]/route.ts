import { MembershipRole, ReviewDecisionType } from "@prisma/client";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import {
  authorizationErrorResponse,
  AuthorizationError,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { isSameOriginRequest } from "@/lib/http";

const reviewSchema = z
  .object({
    decision: z.enum(["ACCEPT", "REJECT"]),
    reason: z.string().trim().min(5).max(500).optional(),
  })
  .refine((value) => value.decision !== "REJECT" || Boolean(value.reason), {
    path: ["reason"],
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; matchId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }
    const { organizationId, matchId } = await params;
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
            "Choose an action and provide a reason when rejecting a match.",
        },
        { status: 400 },
      );

    const result = await getPrisma().$transaction(async (transaction) => {
      const match = await transaction.proposedTransactionMatch.findFirst({
        where: { id: matchId, organizationId, status: "PROPOSED" },
        select: { id: true, normalizedTransactionId: true, candidateId: true },
      });
      if (!match) return null;

      const updated = await transaction.proposedTransactionMatch.updateMany({
        where: { id: matchId, organizationId, status: "PROPOSED" },
        data: {
          status: parsed.data.decision === "ACCEPT" ? "ACCEPTED" : "REJECTED",
        },
      });
      if (updated.count !== 1) return null;

      if (parsed.data.decision === "ACCEPT") {
        await transaction.normalizedTransaction.updateMany({
          where: { id: match.normalizedTransactionId, organizationId },
          data: { status: "MATCHED" },
        });
        await transaction.proposedTransactionMatch.updateMany({
          where: {
            organizationId,
            normalizedTransactionId: match.normalizedTransactionId,
            id: { not: match.id },
            status: "PROPOSED",
          },
          data: { status: "EXPIRED" },
        });
      }

      await transaction.humanReviewDecision.create({
        data: {
          organizationId,
          normalizedTransactionId: match.normalizedTransactionId,
          reviewedById: actor.id,
          decisionType:
            parsed.data.decision === "ACCEPT"
              ? ReviewDecisionType.ACCEPT_MATCH
              : ReviewDecisionType.REJECT_MATCH,
          rationale: parsed.data.reason ?? null,
          decisionMetadata: {
            matchId: match.id,
            candidateId: match.candidateId,
          },
        },
      });
      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorId: actor.id,
          action: "REVIEW",
          entityType: "ProposedTransactionMatch",
          entityId: match.id,
          metadata: {
            decision: parsed.data.decision,
            reason: parsed.data.reason ?? null,
          },
        },
      });
      return { id: match.id, decision: parsed.data.decision };
    });

    if (!result) throw new AuthorizationError(404);
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
