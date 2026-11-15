import { z } from "zod";
import {
  authorizationErrorResponse,
  requirePlatformAdmin,
} from "@/lib/auth/authorization";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

const membershipRoleSchema = z.object({
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
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const admin = await requirePlatformAdmin();
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const parsed = membershipRoleSchema.safeParse(body.data);
    if (!parsed.success) {
      return Response.json(
        { error: "Choose an allowed member role." },
        { status: 400 },
      );
    }

    const { organizationId, membershipId } = await params;
    const result = await getPrisma().$transaction(async (transaction) => {
      const membership = await transaction.organizationMembership.findFirst({
        where: { id: membershipId, organizationId },
        select: {
          id: true,
          role: true,
          user: { select: { accountType: true } },
        },
      });
      if (!membership) return "not-found";
      if (
        membership.role === "OWNER" ||
        membership.user.accountType !== "LANDLORD"
      ) {
        return "protected";
      }
      if (membership.role === parsed.data.role) return "unchanged";

      const updated = await transaction.organizationMembership.updateMany({
        where: {
          id: membership.id,
          organizationId,
          role: membership.role,
        },
        data: { role: parsed.data.role },
      });
      if (updated.count !== 1) return "changed";

      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorId: admin.id,
          action: "UPDATE",
          entityType: "OrganizationMembership",
          entityId: membership.id,
          metadata: {
            previousRole: membership.role,
            role: parsed.data.role,
          },
        },
      });
      return "updated";
    });

    if (result === "not-found") {
      return Response.json(
        { error: "Organization member not found." },
        { status: 404 },
      );
    }
    if (result === "protected") {
      return Response.json(
        { error: "Owner and non-landlord memberships cannot be changed here." },
        { status: 409 },
      );
    }
    if (result === "changed") {
      return Response.json(
        { error: "The membership changed. Refresh and retry." },
        { status: 409 },
      );
    }
    return Response.json({ updated: true });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ organizationId: string; membershipId: string }>;
  },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const admin = await requirePlatformAdmin();
    const { organizationId, membershipId } = await params;
    const result = await getPrisma().$transaction(async (transaction) => {
      const membership = await transaction.organizationMembership.findFirst({
        where: { id: membershipId, organizationId },
        select: {
          id: true,
          role: true,
          userId: true,
          user: {
            select: { accountType: true, email: true },
          },
        },
      });
      if (!membership) return "not-found";
      if (
        membership.role === "OWNER" ||
        membership.user.accountType !== "LANDLORD"
      ) {
        return "protected";
      }

      const deleted = await transaction.organizationMembership.deleteMany({
        where: {
          id: membership.id,
          organizationId,
          role: membership.role,
        },
      });
      if (deleted.count !== 1) return "changed";

      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorId: admin.id,
          action: "DELETE",
          entityType: "OrganizationMembership",
          entityId: membership.id,
          metadata: {
            userId: membership.userId,
            email: membership.user.email,
            role: membership.role,
          },
        },
      });
      return "deleted";
    });

    if (result === "not-found") {
      return Response.json(
        { error: "Organization member not found." },
        { status: 404 },
      );
    }
    if (result === "protected") {
      return Response.json(
        { error: "Owner and non-landlord memberships cannot be removed here." },
        { status: 409 },
      );
    }
    if (result === "changed") {
      return Response.json(
        { error: "The membership changed. Refresh and retry." },
        { status: 409 },
      );
    }
    return Response.json({ deleted: true });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
