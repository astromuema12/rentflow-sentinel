import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { MembershipRole } from "@prisma/client";
import { isSameOriginRequest } from "@/lib/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }

    const { organizationId } = await params;
    await requireOrganizationAccess(organizationId, MembershipRole.OPERATOR);

    const prisma = getPrisma();

    const unlinkedSourceRecords = await prisma.importedSourceRecord.findMany({
      where: {
        organizationId,
        normalizedTransaction: null,
      },
      include: {
        importBatch: true,
      },
    });

    const existingNormalized = await prisma.normalizedTransaction.findMany({
      where: { organizationId },
      select: { importedSourceRecordId: true },
    });
    const linkedIds = new Set(
      existingNormalized.map((t) => t.importedSourceRecordId).filter(Boolean),
    );

    const toProcess = unlinkedSourceRecords.filter((r) => !linkedIds.has(r.id));

    for (const record of toProcess) {
      const raw = record.rawData as Record<string, unknown>;
      const rawType = raw.Type ?? raw.type ?? raw.TRANSACTION_TYPE;
      const typeStr = typeof rawType === "string" ? rawType.toUpperCase() : "";
      const type = typeStr === "DEBIT" || typeStr === "DR" ? "DEBIT" : "CREDIT";

      await prisma.normalizedTransaction.create({
        data: {
          organizationId,
          importBatchId: record.importBatchId,
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

    const run = await prisma.reconciliationRun.create({
      data: {
        organizationId,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        summary: {
          processed: toProcess.length,
          total: unlinkedSourceRecords.length,
        },
      },
    });

    // Simple matching logic - look for exact amount matches
    const unlinkedTxns = await prisma.normalizedTransaction.findMany({
      where: {
        organizationId,
        status: "UNRECONCILED",
        proposedMatches: { none: {} },
      },
    });

    const sourceRecords = await prisma.importedSourceRecord.findMany({
      where: { organizationId },
    });

    for (const txn of unlinkedTxns) {
      const matches = sourceRecords.filter(
        (sr) =>
          Math.abs(Number(sr.amount) - Number(txn.amount)) < 0.01 &&
          sr.payerPayee === txn.payerPayee,
      );

      for (const match of matches.slice(0, 3)) {
        const confidence = "HIGH";
        await prisma.proposedTransactionMatch.create({
          data: {
            organizationId,
            reconciliationRunId: run.id,
            normalizedTransactionId: txn.id,
            candidateId: match.id,
            confidence,
            score: 0.8,
            matchCriteria: { amount: true, payerPayee: true },
            status: "PROPOSED",
          },
        });
      }
    }

    return NextResponse.json({
      runId: run.id,
      processed: toProcess.length,
      suggestedMatches: unlinkedTxns.length,
    });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
