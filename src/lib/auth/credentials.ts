import bcrypt from "bcryptjs";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { consumeRateLimit, createRateLimitKey } from "./rate-limit";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

const DUMMY_PASSWORD_HASH =
  "$2b$12$BsRL1Jxn.BqvSVgX7yWzwuMsBVxYh.GxEUrtiSa.OJriLCnS8okDm";

export async function authorizeCredentials(
  credentials: Partial<Record<"email" | "password", unknown>>,
  request: Request,
) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success || Buffer.byteLength(parsed.data.password, "utf8") > 72) {
    return null;
  }

  const email = parsed.data.email.toLowerCase();
  const allowed = await consumeRateLimit(
    createRateLimitKey("login", email),
    10,
  );
  const clientAddress = request.headers.get("x-real-ip")?.trim();
  const addressAllowed = clientAddress
    ? await consumeRateLimit(createRateLimitKey("login-ip", clientAddress), 100)
    : true;

  if (!allowed || !addressAllowed) {
    return null;
  }

  const user = await getPrisma().user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      isActive: true,
      sessionVersion: true,
      firstName: true,
      lastName: true,
    },
  });

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !user.isActive || !passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
    sessionVersion: user.sessionVersion,
  };
}
