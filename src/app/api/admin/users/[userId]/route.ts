import {
  authorizationErrorResponse,
  requirePlatformAdmin,
} from "@/lib/auth/authorization";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const admin = await requirePlatformAdmin();
    const parsedBody = await parseJsonRequest(request);
    if ("response" in parsedBody) return parsedBody.response;
    const body = parsedBody.data;
    if (
      typeof body !== "object" ||
      body === null ||
      !("isActive" in body) ||
      typeof body.isActive !== "boolean"
    ) {
      return Response.json(
        { error: "Choose an account status." },
        { status: 400 },
      );
    }
    const isActive = body.isActive;

    const { userId } = await params;
    if (admin.id === userId) {
      return Response.json(
        { error: "You cannot suspend your own admin account." },
        { status: 409 },
      );
    }
    const target = await getPrisma().user.findUnique({
      where: { id: userId },
      select: { accountType: true, isActive: true },
    });
    if (!target || target.accountType === "PLATFORM_ADMIN") {
      return Response.json(
        { error: "Account not found or cannot be managed here." },
        { status: 404 },
      );
    }
    if (target.isActive === isActive) {
      return Response.json({ updated: true });
    }

    const updated = await getPrisma().$transaction(async (transaction) => {
      const result = await transaction.user.updateMany({
        where: {
          id: userId,
          accountType: target.accountType,
          isActive: target.isActive,
        },
        data: {
          isActive,
          sessionVersion: { increment: 1 },
        },
      });
      if (!result.count) return false;

      await transaction.auditEvent.create({
        data: {
          actorId: admin.id,
          action: "UPDATE",
          entityType: "User",
          entityId: userId,
          metadata: {
            accountType: target.accountType,
            isActive,
          },
        },
      });
      return true;
    });
    if (!updated) {
      return Response.json(
        { error: "The account changed before this update. Refresh and retry." },
        { status: 409 },
      );
    }
    return Response.json({ updated: true });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
