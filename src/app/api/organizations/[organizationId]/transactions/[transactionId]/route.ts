import { z } from "zod";
import { MembershipRole, TransactionStatus } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  authorizationErrorResponse,
  AuthorizationError,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { isSameOriginRequest } from "@/lib/http";

const updateSchema = z.object({
  status: z.enum(TransactionStatus),
});

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ organizationId: string; transactionId: string }>;
  },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }

    const { organizationId, transactionId } = await params;
    const actor = await requireOrganizationAccess(
      organizationId,
      MembershipRole.OPERATOR,
    );
    const body: unknown = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid transaction update." },
        { status: 400 },
      );
    }

    const updated = await getPrisma().$transaction(async (transaction) => {
      const result = await transaction.normalizedTransaction.updateMany({
        where: { id: transactionId, organizationId },
        data: { status: parsed.data.status },
      });

      if (result.count !== 1) {
        return null;
      }

      const record = await transaction.normalizedTransaction.findFirst({
        where: { id: transactionId, organizationId },
        select: { id: true, status: true, updatedAt: true },
      });

      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorId: actor.id,
          action: "UPDATE",
          entityType: "NormalizedTransaction",
          entityId: transactionId,
          metadata: { status: parsed.data.status },
        },
      });

      return record;
    });

    if (!updated) {
      throw new AuthorizationError(404);
    }

    return Response.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
