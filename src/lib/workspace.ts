import { getPrisma } from "@/lib/prisma";
import { requireOrganizationAccess } from "@/lib/auth/authorization";
import { MembershipRole } from "@prisma/client";

export async function getOrganizationWorkspace(
  organizationId: string,
  minimumRole: MembershipRole = MembershipRole.VIEWER,
) {
  const access = await requireOrganizationAccess(organizationId, minimumRole);
  const organization = await getPrisma().organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, currency: true },
  });

  if (!organization) {
    throw new Error("Authorized organization was not found.");
  }

  return { ...access, organization };
}

export function formatMoney(amount: number | string, currency: string): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
  }).format(date);
}
