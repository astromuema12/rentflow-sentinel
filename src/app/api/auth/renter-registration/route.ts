import bcrypt from "bcryptjs";
import { Prisma, UserAccountType } from "@prisma/client";
import { authorizationErrorResponse } from "@/lib/auth/authorization";
import { consumeRateLimit, createRateLimitKey } from "@/lib/auth/rate-limit";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";
import { renterRegistrationSchema } from "@/lib/rental-validation";

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
  const ip = request.headers.get("x-real-ip")?.trim();
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

    await getPrisma().user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        accountType: UserAccountType.RENTER,
      },
      select: { id: true },
    });
    return Response.json({ created: true }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }
    return authorizationErrorResponse(error);
  }
}
