import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  authorizationErrorResponse,
  requirePlatformAdmin,
} from "@/lib/auth/authorization";
import { isSameOriginRequest, parseJsonRequest } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const admin = await requirePlatformAdmin();
    const body = await parseJsonRequest(request);
    if ("response" in body) return body.response;
    const parsed = updateOrganizationSchema.safeParse(body.data);
    if (!parsed.success) {
      return Response.json(
        { error: "Enter a valid organization name, slug, or status." },
        { status: 400 },
      );
    }

    const { organizationId } = await params;
    const result = await getPrisma().$transaction(async (transaction) => {
      const current = await transaction.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          updatedAt: true,
        },
      });
      if (!current) return "not-found";

      const next = {
        name: parsed.data.name ?? current.name,
        slug: parsed.data.slug ?? current.slug,
        isActive: parsed.data.isActive ?? current.isActive,
      };
      if (
        next.name === current.name &&
        next.slug === current.slug &&
        next.isActive === current.isActive
      ) {
        return "unchanged";
      }

      const updated = await transaction.organization.updateMany({
        where: { id: current.id, updatedAt: current.updatedAt },
        data: next,
      });
      if (updated.count !== 1) return "changed";

      await transaction.auditEvent.create({
        data: {
          organizationId,
          actorId: admin.id,
          action: "UPDATE",
          entityType: "Organization",
          entityId: organizationId,
          metadata: {
            previous: {
              name: current.name,
              slug: current.slug,
              isActive: current.isActive,
            },
            next,
          },
        },
      });
      return "updated";
    });

    if (result === "not-found") {
      return Response.json(
        { error: "Organization not found." },
        { status: 404 },
      );
    }
    if (result === "changed") {
      return Response.json(
        { error: "The organization changed. Refresh and retry." },
        { status: 409 },
      );
    }
    return Response.json({ updated: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "That organization slug is already in use." },
        { status: 409 },
      );
    }
    return authorizationErrorResponse(error);
  }
}
