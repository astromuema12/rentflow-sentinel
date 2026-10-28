import { getPrisma } from "@/lib/prisma";
import {
  authorizationErrorResponse,
  AuthorizationError,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { MembershipRole } from "@prisma/client";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      organizationId: string;
      importBatchId: string;
      recordId: string;
    }>;
  },
) {
  try {
    const { organizationId, importBatchId, recordId } = await params;
    await requireOrganizationAccess(organizationId, MembershipRole.VIEWER);

    const record = await getPrisma().importedSourceRecord.findFirst({
      where: { id: recordId, importBatchId, organizationId },
      select: { id: true, rawData: true, createdAt: true },
    });

    if (!record) {
      throw new AuthorizationError(404);
    }

    return Response.json(
      { id: record.id, createdAt: record.createdAt, data: record.rawData },
      {
        headers: {
          "Content-Disposition": `attachment; filename="import-record-${record.id}.json"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
