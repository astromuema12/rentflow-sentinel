import {
  authorizationErrorResponse,
  requirePlatformAdmin,
} from "@/lib/auth/authorization";
import { createOrganizationInvitationToken } from "@/lib/auth/organization-invitation";
import {
  EmailDeliveryError,
  sendOrganizationInvitationEmail,
} from "@/lib/auth/email";
import { isSameOriginRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  try {
    const admin = await requirePlatformAdmin();
    const { invitationId } = await params;
    const prisma = getPrisma();
    const token = createOrganizationInvitationToken();
    const invitation = await prisma.$transaction(
      async (transaction) => {
        const current = await transaction.organizationInvitation.findFirst({
          where: { id: invitationId, acceptedAt: null },
          select: {
            id: true,
            organizationId: true,
            tokenHash: true,
            email: true,
            firstName: true,
            organization: { select: { name: true } },
          },
        });
        if (!current) return null;

        const updated = await transaction.organizationInvitation.updateMany({
          where: {
            id: current.id,
            tokenHash: current.tokenHash,
            acceptedAt: null,
          },
          data: { tokenHash: token.tokenHash, expiresAt: token.expiresAt },
        });
        if (updated.count !== 1) return null;

        await transaction.auditEvent.create({
          data: {
            organizationId: current.organizationId,
            actorId: admin.id,
            action: "UPDATE",
            entityType: "OrganizationInvitation",
            entityId: current.id,
            metadata: { action: "resent", email: current.email },
          },
        });

        return current;
      },
      { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 },
    );

    if (!invitation) {
      return Response.json(
        { error: "Pending invitation not found." },
        { status: 404 },
      );
    }

    const invitationUrl = new URL(
      "/accept-invitation",
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin,
    );
    invitationUrl.searchParams.set("token", token.token);

    try {
      await sendOrganizationInvitationEmail(
        invitation.email,
        invitation.firstName,
        invitation.organization.name,
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
          error: "The invitation email could not be delivered. You can retry.",
        },
        { status: 503 },
      );
    }

    return Response.json({ sent: true });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
