import { z } from "zod";
import { MembershipRole } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  authorizationErrorResponse,
  AuthorizationError,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { isSameOriginRequest } from "@/lib/http";

const membershipUpdateSchema = z.object({
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]),
});

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ organizationId: string; membershipId: string }>;
  },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
    }

    const { organizationId, membershipId } = await params;
    const actor = await requireOrganizationAccess(
      organizationId,
      MembershipRole.ADMIN,
    );
    const body: unknown = await request.json().catch(() => null);
    const parsed = membershipUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid membership update." },
        { status: 400 },
      );
    }

    const result = await getPrisma().$transaction(
      async (transaction) => {
        const target = await transaction.organizationMembership.findFirst({
          where: { id: membershipId, organizationId },
          select: { id: true, userId: true, role: true },
        });

        if (!target || target.userId === actor.id) {
          return { kind: "not-found" as const };
        }

        if (
          target.role === MembershipRole.OWNER &&
          actor.role !== MembershipRole.OWNER
        ) {
          return { kind: "forbidden" as const };
        }

        if (target.role === MembershipRole.OWNER) {
          const ownerCount = await transaction.organizationMembership.count({
            where: { organizationId, role: MembershipRole.OWNER },
          });

          if (ownerCount <= 1) {
            return { kind: "last-owner" as const };
          }
        }

        const updated = await transaction.organizationMembership.updateMany({
          where: { id: target.id, organizationId },
          data: { role: parsed.data.role },
        });
        if (updated.count !== 1) {
          return { kind: "not-found" as const };
        }

        const membership = await transaction.organizationMembership.findFirst({
          where: { id: target.id, organizationId },
          select: { id: true, userId: true, role: true },
        });
        if (!membership) {
          return { kind: "not-found" as const };
        }

        await transaction.auditEvent.create({
          data: {
            organizationId,
            actorId: actor.id,
            action: "UPDATE",
            entityType: "OrganizationMembership",
            entityId: membership.id,
            metadata: { role: membership.role },
          },
        });

        return { kind: "updated" as const, membership };
      },
      { isolationLevel: "Serializable" },
    );

    if (result.kind === "not-found") {
      throw new AuthorizationError(404);
    }
    if (result.kind === "forbidden") {
      throw new AuthorizationError(403);
    }
    if (result.kind === "last-owner") {
      return Response.json(
        { error: "An organization must keep at least one owner." },
        { status: 409 },
      );
    }

    return Response.json(result.membership, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
