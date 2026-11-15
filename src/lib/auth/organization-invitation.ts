import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function hashOrganizationInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createOrganizationInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashOrganizationInvitationToken(token),
    expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
  };
}

export async function acceptOrganizationInvitation(
  token: string,
  password: string,
): Promise<"accepted" | "invalid" | "email-in-use"> {
  const prisma = getPrisma();
  const tokenHash = hashOrganizationInvitationToken(token);
  const now = new Date();
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { tokenHash },
    select: { id: true, tokenHash: true, expiresAt: true, acceptedAt: true },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= now) {
    return "invalid";
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(
    async (transaction) => {
      const currentInvitation =
        await transaction.organizationInvitation.findUnique({
          where: { tokenHash: invitation.tokenHash },
          select: {
            id: true,
            organizationId: true,
            email: true,
            firstName: true,
            lastName: true,
            expiresAt: true,
            acceptedAt: true,
          },
        });

      if (
        !currentInvitation ||
        currentInvitation.acceptedAt ||
        currentInvitation.expiresAt <= now
      ) {
        return "invalid";
      }

      const existingUser = await transaction.user.findUnique({
        where: { email: currentInvitation.email },
        select: { id: true },
      });

      if (existingUser) return "email-in-use";

      const claimed = await transaction.organizationInvitation.updateMany({
        where: {
          id: currentInvitation.id,
          tokenHash: invitation.tokenHash,
          acceptedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });

      if (claimed.count !== 1) return "invalid";

      const user = await transaction.user.create({
        data: {
          email: currentInvitation.email,
          firstName: currentInvitation.firstName,
          lastName: currentInvitation.lastName,
          passwordHash,
          accountType: "LANDLORD",
        },
        select: { id: true },
      });
      const membership = await transaction.organizationMembership.create({
        data: {
          organizationId: currentInvitation.organizationId,
          userId: user.id,
          role: "OWNER",
        },
        select: { id: true },
      });

      await transaction.auditEvent.create({
        data: {
          organizationId: currentInvitation.organizationId,
          actorId: user.id,
          action: "CREATE",
          entityType: "OrganizationMembership",
          entityId: membership.id,
          metadata: { role: "OWNER", invited: true },
        },
      });

      return "accepted";
    },
    { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 },
  );
}
