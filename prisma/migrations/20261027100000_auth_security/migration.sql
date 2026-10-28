ALTER TABLE "User"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "AuthRateLimit_windowStartedAt_idx"
ON "AuthRateLimit"("windowStartedAt");

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
ON "PasswordResetToken"("tokenHash");

CREATE INDEX "PasswordResetToken_userId_idx"
ON "PasswordResetToken"("userId");

CREATE INDEX "PasswordResetToken_expiresAt_idx"
ON "PasswordResetToken"("expiresAt");

ALTER TABLE "PasswordResetToken"
ADD CONSTRAINT "PasswordResetToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ImportBatch_id_organizationId_key"
ON "ImportBatch"("id", "organizationId");

CREATE UNIQUE INDEX "ImportedSourceRecord_id_organizationId_key"
ON "ImportedSourceRecord"("id", "organizationId");

CREATE UNIQUE INDEX "NormalizedTransaction_id_organizationId_key"
ON "NormalizedTransaction"("id", "organizationId");

CREATE UNIQUE INDEX "NormalizedTransaction_importedSourceRecordId_organizationId_key"
ON "NormalizedTransaction"("importedSourceRecordId", "organizationId");

CREATE UNIQUE INDEX "ReconciliationRun_id_organizationId_key"
ON "ReconciliationRun"("id", "organizationId");

ALTER TABLE "ProposedTransactionMatch"
ADD COLUMN "organizationId" TEXT;

UPDATE "ProposedTransactionMatch" AS proposed
SET "organizationId" = run."organizationId"
FROM "ReconciliationRun" AS run
WHERE proposed."reconciliationRunId" = run."id";

ALTER TABLE "ProposedTransactionMatch"
ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "ProposedTransactionMatch_organizationId_idx"
ON "ProposedTransactionMatch"("organizationId");

ALTER TABLE "ImportedSourceRecord"
DROP CONSTRAINT "ImportedSourceRecord_importBatchId_fkey",
ADD CONSTRAINT "ImportedSourceRecord_importBatchId_organizationId_fkey"
FOREIGN KEY ("importBatchId", "organizationId")
REFERENCES "ImportBatch"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NormalizedTransaction"
DROP CONSTRAINT "NormalizedTransaction_importBatchId_fkey",
DROP CONSTRAINT "NormalizedTransaction_importedSourceRecordId_fkey",
ADD CONSTRAINT "NormalizedTransaction_importBatchId_organizationId_fkey"
FOREIGN KEY ("importBatchId", "organizationId")
REFERENCES "ImportBatch"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "NormalizedTransaction_importedSourceRecordId_organizationId_fkey"
FOREIGN KEY ("importedSourceRecordId", "organizationId")
REFERENCES "ImportedSourceRecord"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReconciliationRun"
DROP CONSTRAINT "ReconciliationRun_importBatchId_fkey",
ADD CONSTRAINT "ReconciliationRun_importBatchId_organizationId_fkey"
FOREIGN KEY ("importBatchId", "organizationId")
REFERENCES "ImportBatch"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProposedTransactionMatch"
DROP CONSTRAINT "ProposedTransactionMatch_reconciliationRunId_fkey",
DROP CONSTRAINT "ProposedTransactionMatch_normalizedTransactionId_fkey",
ADD CONSTRAINT "ProposedTransactionMatch_reconciliationRunId_organizationId_fkey"
FOREIGN KEY ("reconciliationRunId", "organizationId")
REFERENCES "ReconciliationRun"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ProposedTransactionMatch_normalizedTransactionId_organizationId_fkey"
FOREIGN KEY ("normalizedTransactionId", "organizationId")
REFERENCES "NormalizedTransaction"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReconciliationException"
DROP CONSTRAINT "ReconciliationException_reconciliationRunId_fkey",
DROP CONSTRAINT "ReconciliationException_normalizedTransactionId_fkey",
ADD CONSTRAINT "ReconciliationException_reconciliationRunId_organizationId_fkey"
FOREIGN KEY ("reconciliationRunId", "organizationId")
REFERENCES "ReconciliationRun"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "ReconciliationException_normalizedTransactionId_organizationId_fkey"
FOREIGN KEY ("normalizedTransactionId", "organizationId")
REFERENCES "NormalizedTransaction"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HumanReviewDecision"
DROP CONSTRAINT "HumanReviewDecision_normalizedTransactionId_fkey",
ADD CONSTRAINT "HumanReviewDecision_normalizedTransactionId_organizationId_fkey"
FOREIGN KEY ("normalizedTransactionId", "organizationId")
REFERENCES "NormalizedTransaction"("id", "organizationId")
ON DELETE RESTRICT ON UPDATE CASCADE;
