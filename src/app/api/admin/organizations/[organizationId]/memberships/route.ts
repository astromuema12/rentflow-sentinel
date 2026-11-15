import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  authorizationErrorResponse,
  requirePlatformAdmin,
} from "@/lib/auth/authorization";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

const addMembershipSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
  role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const admin = await requirePlatformAdmin();
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const parsed = addMembershipSchema.safeParse(body.data);
    if (!parsed.success) {
      return Response.json(
        { error: "Enter a valid landlord email and member role." },
        { status: 400 },
      );
    }

    const { organizationId } = await params;
    const result = await getPrisma().$transaction(async (transaction) => {
      const organization = await transaction.organization.findUnique({
        where: { id: organizationId },
        select: { isActive: true },
      });
      if (!organization) return { kind: "not-found" as const };
      if (!organization.isActive) return { kind: "inactive" as const };

      const user = await transaction.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true, accountType: true, isActive: true },
      });
      if (!user || user.accountType !== "LANDLORD" || !user.isActive) {
        return { kind: "user-not-eligible" as const };
      }

      const existing = await transaction.organizationMembership.findUnique({
        where: {
          organizationId_userId: { organizationId, userId: user.id },
        },
        select: { id: true },
      });
      if (existing) return { kind: "exists" as const };

      const membership = await transaction.organizationMembership.create({
        data: {
          organizationId,
          userId: user.id,
          role: parsed.data.role,
        },
        select: { id: true },
      });
      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorId: admin.id,
          action: "CREATE",
          entityType: "OrganizationMembership",
          entityId: membership.id,
          metadata: {
            userId: user.id,
            email: parsed.data.email,
            role: parsed.data.role,
          },
        },
      });
      return { kind: "created" as const, membership };
    });

    if (result.kind === "not-found") {
      return Response.json(
        { error: "Organization not found." },
        { status: 404 },
      );
    }
    if (result.kind === "inactive") {
      return Response.json(
        { error: "Reactivate the organization before adding members." },
        { status: 409 },
      );
    }
    if (result.kind === "user-not-eligible") {
      return Response.json(
        { error: "An active landlord account is required." },
        { status: 404 },
      );
    }
    if (result.kind === "exists") {
      return Response.json(
        { error: "That landlord is already a member of this organization." },
        { status: 409 },
      );
    }
    return Response.json(result.membership, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "That landlord is already a member of this organization." },
        { status: 409 },
      );
    }
    return authorizationErrorResponse(error);
  }
}
