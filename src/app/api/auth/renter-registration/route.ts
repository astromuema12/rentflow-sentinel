import { UserAccountType } from "@prisma/client";
import { authorizationErrorResponse } from "@/lib/auth/authorization";
import { consumeRateLimit, createRateLimitKey } from "@/lib/auth/rate-limit";
import {
  getTrustedClientAddress,
  isSameOriginRequest,
  parseJsonRequest,
} from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { renterRegistrationSchema } from "@/lib/rental-validation";
import {
  EmailDeliveryError,
  sendRenterVerificationEmail,
} from "@/lib/auth/email";
import { createRenterVerificationToken } from "@/lib/auth/renter-email-verification";

const genericResponse = {
  message:
    "If this address can be registered, we’ll email a link to verify it and choose a password.",
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const body = await parseJsonRequest(request);
  if ("response" in body) return body.response;
  const parsed = renterRegistrationSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json(
      {
        error:
          "Enter your name, a valid email, and a password of at least 10 characters.",
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const ip = getTrustedClientAddress(request);
  try {
    const emailAllowed = await consumeRateLimit(
      createRateLimitKey("renter-registration-email", email),
      5,
    );
    const ipAllowed = ip
      ? await consumeRateLimit(
          createRateLimitKey("renter-registration-ip", ip),
          20,
        )
      : true;
    if (!emailAllowed || !ipAllowed) {
      return Response.json(
        { error: "Too many account creation attempts. Try again later." },
        { status: 429 },
      );
    }

    const prisma = getPrisma();
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
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
      return Response.json(genericResponse, { status: 202 });
    }

    const verification = createRenterVerificationToken();
    await prisma.$transaction(async (transaction) => {
      await transaction.renterEmailVerificationToken.deleteMany({
        where: { email, consumedAt: null },
      });
      await transaction.renterEmailVerificationToken.create({
        data: {
          email,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          tokenHash: verification.tokenHash,
          expiresAt: verification.expiresAt,
        },
      });
    });

    const verificationUrl = new URL(
      "/verify-email",
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin,
    );
    verificationUrl.searchParams.set("token", verification.token);

    try {
      await sendRenterVerificationEmail(
        email,
        parsed.data.firstName,
        verificationUrl.toString(),
      );
    } catch (error) {
      if (!(error instanceof EmailDeliveryError)) {
        console.error(
          "Renter verification email could not be delivered.",
          error,
        );
      }
      return Response.json(
        {
          error:
            "The verification email could not be delivered. Retry the request to send a new link.",
        },
        { status: 503 },
      );
    }

    return Response.json(genericResponse, { status: 202 });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
