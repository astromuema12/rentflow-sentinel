import { z } from "zod";
import { consumePasswordResetToken } from "@/lib/auth/password-reset";
import { consumeRateLimit, createRateLimitKey } from "@/lib/auth/rate-limit";
import { isSameOriginRequest } from "@/lib/http";

const confirmSchema = z.object({
  token: z.string().min(32).max(128),
  password: z
    .string()
    .min(12)
    .max(72)
    .regex(/[a-zA-Z]/)
    .regex(/[0-9]/),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          "Use a valid reset link and a password of at least 12 characters.",
      },
      { status: 400 },
    );
  }

  const clientAddress = request.headers.get("x-real-ip")?.trim();
  if (clientAddress) {
    const allowed = await consumeRateLimit(
      createRateLimitKey("password-reset-confirm-ip", clientAddress),
      20,
    );
    if (!allowed) {
      return Response.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "900" } },
      );
    }
  }

  const changed = await consumePasswordResetToken(
    parsed.data.token,
    parsed.data.password,
  );

  if (!changed) {
    return Response.json(
      { error: "This password reset link is invalid or expired." },
      { status: 400 },
    );
  }

  return Response.json({ message: "Password updated. You can now sign in." });
}
