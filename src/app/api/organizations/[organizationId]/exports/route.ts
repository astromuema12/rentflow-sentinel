import { getPrisma } from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { MembershipRole } from "@prisma/client";

type ExportValue = string | number | null | undefined;

function csvCell(value: ExportValue, numeric = false): string {
  const text = value == null ? "" : String(value);
  const safeText =
    numeric && /^-?\d+(?:\.\d+)?$/.test(text)
      ? text
      : /^[\u0000-\u0020]*[=+\-@]/.test(text)
        ? `'${text}`
        : text;

  return `"${safeText.replaceAll('"', '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  try {
    const { organizationId } = await params;
    await requireOrganizationAccess(organizationId, MembershipRole.VIEWER);

    const transactions = await getPrisma().normalizedTransaction.findMany({
      where: { organizationId },
      select: {
        transactionDate: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        description: true,
        payerPayee: true,
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
    });

    const lines = [
      [
        "Date",
        "Type",
        "Amount",
        "Currency",
        "Status",
        "Reference",
        "Description",
        "Payer or payee",
      ]
        .map((value) => csvCell(value))
        .join(","),
      ...transactions.map((transaction) =>
        [
          csvCell(transaction.transactionDate.toISOString().slice(0, 10)),
          csvCell(transaction.type),
          csvCell(transaction.amount.toString(), true),
          csvCell(transaction.currency),
          csvCell(transaction.status),
          csvCell(transaction.reference),
          csvCell(transaction.description),
          csvCell(transaction.payerPayee),
        ].join(","),
      ),
    ];

    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="rentflow-transactions.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
