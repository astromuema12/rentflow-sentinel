import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";

const TOKEN_LIFETIME_MS = 30 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const prisma = getPrisma();
  const expiresAt = new Date(Date.now() + TOKEN_LIFETIME_MS);

  await prisma.$transaction(async (transaction) => {
    await transaction.passwordResetToken.deleteMany({ where: { userId } });
    await transaction.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashResetToken(token),
        expiresAt,
      },
    });
  });

  return { token, expiresAt };
}

export async function consumePasswordResetToken(
  token: string,
  password: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (!resetToken || resetToken.consumedAt || resetToken.expiresAt <= now) {
    return false;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.$transaction(async (transaction) => {
    const consumed = await transaction.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    if (consumed.count !== 1) {
      return false;
    }

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });

    return true;
  });
}
