import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  authorizationErrorResponse,
  requirePlatformAdmin,
} from "@/lib/auth/authorization";
import { createOrganizationInvitationToken } from "@/lib/auth/organization-invitation";
import {
  EmailDeliveryError,
  sendOrganizationInvitationEmail,
} from "@/lib/auth/email";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).toLowerCase(),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  try {
    const admin = await requirePlatformAdmin();
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const parsed = createOrganizationSchema.safeParse(body.data);

    if (!parsed.success) {
      return Response.json(
        {
          error:
            "Enter a valid organization name and slug, and the owner’s name and email.",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existingUser) {
      return Response.json(
        { error: "An account already exists for that email address." },
        { status: 409 },
      );
    }

    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        email: parsed.data.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (existingInvitation) {
      return Response.json(
        {
          error:
            "A pending owner invitation already exists for that email address.",
        },
        { status: 409 },
      );
    }

    const invitationToken = createOrganizationInvitationToken();
    const created = await prisma.$transaction(
      async (transaction) => {
        const organization = await transaction.organization.create({
          data: {
            name: parsed.data.name,
            slug: parsed.data.slug,
            currency: "KES",
          },
          select: { id: true, name: true },
        });
        const invitation = await transaction.organizationInvitation.create({
          data: {
            organizationId: organization.id,
            email: parsed.data.email,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            tokenHash: invitationToken.tokenHash,
            expiresAt: invitationToken.expiresAt,
            createdById: admin.id,
          },
          select: { id: true },
        });

        await transaction.auditEvent.create({
          data: {
            organizationId: organization.id,
            actorId: admin.id,
            action: "CREATE",
            entityType: "Organization",
            entityId: organization.id,
            metadata: {
              slug: parsed.data.slug,
              ownerEmail: parsed.data.email,
              invitationId: invitation.id,
            },
          },
        });

        return { organization, invitation };
      },
      { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 },
    );

    const invitationUrl = new URL(
      "/accept-invitation",
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin,
    );
    invitationUrl.searchParams.set("token", invitationToken.token);

    try {
      await sendOrganizationInvitationEmail(
        parsed.data.email,
        parsed.data.firstName,
        created.organization.name,
        invitationUrl.toString(),
      );
    } catch (error) {
      if (!(error instanceof EmailDeliveryError)) {
        console.error(
          "Organization invitation email could not be delivered.",
          error,
        );
      }
      return Response.json(
        {
          error:
            "The organization was created, but the invitation email could not be delivered. Retry it from pending invitations.",
          invitationId: created.invitation.id,
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        organizationId: created.organization.id,
        invitationId: created.invitation.id,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "An organization already uses that slug." },
        { status: 409 },
      );
    }
    return authorizationErrorResponse(error);
  }
}
