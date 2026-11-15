import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  acceptOrganizationInvitation,
  hashOrganizationInvitationToken,
} from "@/lib/auth/organization-invitation";
import { consumeRateLimit, createRateLimitKey } from "@/lib/auth/rate-limit";
import {
  getTrustedClientAddress,
  isSameOriginRequest,
  parseJsonRequest,
} from "@/lib/http";

const acceptInvitationSchema = z.object({
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
  const parsed = acceptInvitationSchema.safeParse(body.data);
  if (!parsed.success || Buffer.byteLength(parsed.data.password, "utf8") > 72) {
    return Response.json(
      {
        error:
          "Use a valid invitation link and a password of at least 12 characters with a number.",
      },
      { status: 400 },
    );
  }

  const address = getTrustedClientAddress(request);
  const tokenAllowed = await consumeRateLimit(
    createRateLimitKey(
      "organization-invitation-accept",
      hashOrganizationInvitationToken(parsed.data.token),
    ),
    10,
  );
  const addressAllowed = address
    ? await consumeRateLimit(
        createRateLimitKey("organization-invitation-accept-ip", address),
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
    const result = await acceptOrganizationInvitation(
      parsed.data.token,
      parsed.data.password,
    );

    if (result === "invalid") {
      return Response.json(
        { error: "This invitation is invalid, expired, or already used." },
        { status: 400 },
      );
    }
    if (result === "email-in-use") {
      return Response.json(
        {
          error:
            "An account already exists for this email. Contact the platform administrator.",
        },
        { status: 409 },
      );
    }

    return Response.json({
      message: "Account setup complete. You can now sign in.",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        {
          error:
            "An account already exists for this email. Contact the platform administrator.",
        },
        { status: 409 },
      );
    }
    console.error("Organization invitation acceptance failed.", error);
    return Response.json(
      { error: "The invitation could not be accepted. Try again later." },
      { status: 500 },
    );
  }
}
