import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  consumeRenterVerificationToken,
  hashRenterVerificationToken,
} from "@/lib/auth/renter-email-verification";
import { consumeRateLimit, createRateLimitKey } from "@/lib/auth/rate-limit";
import {
  getTrustedClientAddress,
  isSameOriginRequest,
  parseJsonRequest,
} from "@/lib/http";

const confirmSchema = z.object({
  token: z
    .string()
    .length(43)
    .regex(/^[A-Za-z0-9_-]+$/),
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

  const body = await parseJsonRequest(request);
  if ("response" in body) return body.response;
  const parsed = confirmSchema.safeParse(body.data);
  if (!parsed.success || Buffer.byteLength(parsed.data.password, "utf8") > 72) {
    return Response.json(
      {
        error:
          "Use a valid verification link and a password of at least 12 characters with a number.",
      },
      { status: 400 },
    );
  }

  const tokenHash = hashRenterVerificationToken(parsed.data.token);
  const tokenAllowed = await consumeRateLimit(
    createRateLimitKey("renter-email-verification", tokenHash),
    10,
  );
  const address = getTrustedClientAddress(request);
  const addressAllowed = address
    ? await consumeRateLimit(
        createRateLimitKey("renter-email-verification-ip", address),
        60,
      )
    : true;
  if (!tokenAllowed || !addressAllowed) {
    return Response.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  try {
    const result = await consumeRenterVerificationToken(
      parsed.data.token,
      parsed.data.password,
    );
    if (result !== "accepted") {
      return Response.json(
        {
          error:
            "This verification link is invalid, expired, or no longer available.",
        },
        { status: 400 },
      );
    }

    return Response.json({
      message: "Email verified. You can now sign in to your renter account.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        {
          error:
            "This email can no longer be registered. Request a new verification link.",
        },
        { status: 409 },
      );
    }
    console.error("Renter email verification failed.", error);
    return Response.json(
      { error: "The verification could not be completed. Try again later." },
      { status: 500 },
    );
  }
}
