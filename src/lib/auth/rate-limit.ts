import { createHmac } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;

export function createRateLimitKey(scope: string, value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  return createHmac("sha256", secret).update(`${scope}:${value}`).digest("hex");
}

export async function consumeRateLimit(
  key: string,
  maximumAttempts: number,
  windowMs = WINDOW_MS,
): Promise<boolean> {
  const prisma = getPrisma();
  const now = new Date();
  const windowStartedAt = new Date(now.getTime() - windowMs);
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (transaction) => {
    await transaction.authRateLimit.upsert({
      where: { key },
      create: { key, attempts: 0, windowStartedAt: now },
      update: {},
    });

    await transaction.authRateLimit.updateMany({
      where: { key, windowStartedAt: { lte: windowStartedAt } },
      data: { attempts: 0, windowStartedAt: now },
    });

    const bucket = await transaction.authRateLimit.update({
      where: { key },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });

    await transaction.authRateLimit.deleteMany({
      where: { windowStartedAt: { lt: cutoff } },
    });

    return bucket.attempts <= maximumAttempts;
  });
}
