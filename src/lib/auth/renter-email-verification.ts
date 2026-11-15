import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { UserAccountType } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function hashRenterVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createRenterVerificationToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashRenterVerificationToken(token),
    expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
  };
}

export async function consumeRenterVerificationToken(
  token: string,
  password: string,
): Promise<"accepted" | "invalid" | "not-eligible"> {
  const prisma = getPrisma();
  const tokenHash = hashRenterVerificationToken(token);
  const now = new Date();
  const invitation = await prisma.renterEmailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, expiresAt: true, consumedAt: true },
  });

  if (!invitation || invitation.consumedAt || invitation.expiresAt <= now) {
    return "invalid";
  }

  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.$transaction(
    async (transaction) => {
      const current = await transaction.renterEmailVerificationToken.findUnique(
        {
          where: { tokenHash },
        },
      );
      if (!current || current.consumedAt || current.expiresAt <= now) {
        return "invalid";
      }

      const existingUser = await transaction.user.findUnique({
        where: { email: current.email },
        select: {
          id: true,
          accountType: true,
          isActive: true,
          emailVerifiedAt: true,
        },
      });

      if (
        existingUser &&
        (existingUser.accountType !== UserAccountType.RENTER ||
          !existingUser.isActive ||
          existingUser.emailVerifiedAt)
      ) {
        return "not-eligible";
      }

      const claimed = await transaction.renterEmailVerificationToken.updateMany(
        {
          where: {
            id: current.id,
            tokenHash,
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        },
      );
      if (claimed.count !== 1) return "invalid";

      let userId: string;
      let action: "CREATE" | "UPDATE";

      if (existingUser) {
        const updated = await transaction.user.updateMany({
          where: {
            id: existingUser.id,
            accountType: UserAccountType.RENTER,
            isActive: true,
            emailVerifiedAt: null,
          },
          data: {
            passwordHash,
            firstName: current.firstName,
            lastName: current.lastName,
            emailVerifiedAt: now,
            sessionVersion: { increment: 1 },
          },
        });
        if (updated.count !== 1) return "invalid";
        userId = existingUser.id;
        action = "UPDATE";
      } else {
        const user = await transaction.user.create({
          data: {
            email: current.email,
            passwordHash,
            firstName: current.firstName,
            lastName: current.lastName,
            accountType: UserAccountType.RENTER,
            emailVerifiedAt: now,
          },
          select: { id: true },
        });
        userId = user.id;
        action = "CREATE";
      }

      await transaction.auditEvent.create({
        data: {
          actorId: userId,
          action,
          entityType: "User",
          entityId: userId,
          metadata: { emailVerified: true, verificationMethod: "email" },
        },
      });

      return "accepted";
    },
    { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 },
  );
}
