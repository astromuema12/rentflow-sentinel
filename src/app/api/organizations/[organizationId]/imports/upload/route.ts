import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { MembershipRole } from "@prisma/client";
import { createHash } from "crypto";
import { isSameOriginRequest } from "@/lib/http";

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        if (inQuotes && lines[i][j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ""));

    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });
      rows.push(row);
    }
  }
  return rows;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    const { organizationId } = await params;
    const access = await requireOrganizationAccess(
      organizationId,
      MembershipRole.OPERATOR,
    );

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    const checksum = createHash("sha256").update(text).digest("hex");

    const batch = await prisma.importBatch.create({
      data: {
        organizationId,
        uploadedById: access.id,
        filename: file.name,
        sourceType: "CSV",
        status: "PROCESSING",
        checksum,
        startedAt: new Date(),
      },
    });

    for (const row of rows) {
      const amountStr =
        row.Amount ||
        row.amount ||
        row.AMOUNT ||
        row["Transaction Amount"] ||
        "0";
      const amount = parseFloat(amountStr.replace(/,/g, ""));
      const dateStr =
        row.Date ||
        row.date ||
        row.DATE ||
        row["Transaction Date"] ||
        row.ValueDate;
      const date = dateStr ? new Date(dateStr) : new Date();
      const description =
        row.Description ||
        row.description ||
        row.Details ||
        row.details ||
        null;
      const reference = row.Reference || row.reference || row.Ref || null;
      const payerPayee =
        row["Payer/Payee"] ||
        row.payerPayee ||
        row.Payee ||
        row.Payer ||
        row["Beneficiary"] ||
        null;

      const rowHash = createHash("sha256")
        .update(JSON.stringify(row))
        .digest("hex");

      const currency = row.Currency || row.currency || "KES";

      await prisma.importedSourceRecord.create({
        data: {
          organizationId,
          importBatchId: batch.id,
          rowHash,
          rawData: row,
          currency,
          amount: Math.abs(amount || 0),
          transactionDate: date,
          description,
          reference,
          payerPayee,
        },
      });
    }

    const sourceRecords = await prisma.importedSourceRecord.findMany({
      where: { importBatchId: batch.id },
    });

    for (const record of sourceRecords) {
      const raw = record.rawData as Record<string, unknown>;
      const rawType = raw.Type ?? raw.type ?? raw.TRANSACTION_TYPE;
      const typeStr = typeof rawType === "string" ? rawType.toUpperCase() : "";
      const type = typeStr === "DEBIT" || typeStr === "DR" ? "DEBIT" : "CREDIT";

      await prisma.normalizedTransaction.create({
        data: {
          organizationId,
          importBatchId: batch.id,
          importedSourceRecordId: record.id,
          type,
          amount: record.amount,
          currency: record.currency,
          transactionDate: record.transactionDate,
          description: record.description,
          reference: record.reference,
          payerPayee: record.payerPayee,
          status: "UNRECONCILED",
        },
      });
      await prisma.importedSourceRecord.update({
        where: { id: record.id },
        data: { processed: true },
      });
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ batchId: batch.id, imported: rows.length });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
