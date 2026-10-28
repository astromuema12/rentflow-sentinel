import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { consumeRateLimit, createRateLimitKey } from "@/lib/auth/rate-limit";
import { issuePasswordResetToken } from "@/lib/auth/password-reset";
import { EmailDeliveryError, sendPasswordResetEmail } from "@/lib/auth/email";
import { isSameOriginRequest } from "@/lib/http";

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const allowed = await consumeRateLimit(
    createRateLimitKey("password-reset", email),
    3,
    60 * 60 * 1000,
  );
  const clientAddress = request.headers.get("x-real-ip")?.trim();
  const addressAllowed = clientAddress
    ? await consumeRateLimit(
        createRateLimitKey("password-reset-ip", clientAddress),
        10,
        60 * 60 * 1000,
      )
    : true;

  if (!allowed || !addressAllowed) {
    return Response.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  try {
    const user = await getPrisma().user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });
    const reset = user?.isActive
      ? await issuePasswordResetToken(user.id)
      : null;
    const resetUrl = reset
      ? new URL(
          `/reset-password?token=${encodeURIComponent(reset.token)}`,
          process.env.NEXT_PUBLIC_APP_URL,
        ).toString()
      : undefined;

    await sendPasswordResetEmail(email, resetUrl);
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      return Response.json(
        { error: "Password reset delivery is temporarily unavailable." },
        { status: 503 },
      );
    }

    console.error("Password reset request failed.", error);
    return Response.json(
      { error: "The request could not be completed." },
      { status: 500 },
    );
  }

  return Response.json(
    {
      message:
        "If an account exists for that address, password reset instructions have been sent.",
    },
    { status: 202 },
  );
}
