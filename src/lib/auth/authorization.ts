import { auth } from "@/auth";
import { MembershipRole } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

const roleRank: Record<MembershipRole, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403 | 404) {
    super(status === 401 ? "Authentication required." : "Access denied.");
    this.name = "AuthorizationError";
  }
}

export async function requireAuthenticatedUser() {
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id || typeof sessionUser.sessionVersion !== "number") {
    throw new AuthorizationError(401);
  }

  const user = await getPrisma().user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!user?.isActive || user.sessionVersion !== sessionUser.sessionVersion) {
    throw new AuthorizationError(401);
  }

  return user;
}

export async function requireOrganizationAccess(
  organizationId: string,
  minimumRole: MembershipRole = MembershipRole.VIEWER,
) {
  const user = await requireAuthenticatedUser();
  const membership = await getPrisma().organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new AuthorizationError(404);
  }

  if (roleRank[membership.role] < roleRank[minimumRole]) {
    throw new AuthorizationError(403);
  }

  return { ...user, organizationId, role: membership.role };
}

export function authorizationErrorResponse(error: unknown): Response {
  if (error instanceof AuthorizationError) {
    const message =
      error.status === 401 ? "Authentication required." : "Access denied.";
    return Response.json({ error: message }, { status: error.status });
  }

  console.error("Protected operation failed.", error);
  return Response.json(
    { error: "The request could not be completed." },
    { status: 500 },
  );
}
