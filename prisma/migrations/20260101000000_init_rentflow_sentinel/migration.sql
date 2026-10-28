-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('UNRECONCILED', 'MATCHED', 'EXCLUDED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXACT');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'AUTO_ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('AMOUNT_MISMATCH', 'DATE_OUT_OF_RANGE', 'DUPLICATE_CANDIDATE', 'UNMATCHABLE', 'MISSING_REFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ReviewDecisionType" AS ENUM ('ACCEPT_MATCH', 'REJECT_MATCH', 'CREATE_ADJUSTMENT', 'EXCLUDE', 'MANUAL_MATCH', 'COMMENT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'RECONCILE', 'REVIEW', 'LOGIN', 'LOGOUT', 'ACCESS_DENIED', 'OTHER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "filename" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "checksum" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedSourceRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "externalId" TEXT,
    "rowHash" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "amount" DECIMAL(19,4) NOT NULL,
    "transactionDate" DATE NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "payerPayee" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormalizedTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT,
    "importedSourceRecordId" TEXT,
    "externalId" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "transactionDate" DATE NOT NULL,
    "valueDate" DATE,
    "description" TEXT,
    "reference" TEXT,
    "payerPayee" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'UNRECONCILED',
    "sourceProvenance" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NormalizedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "importBatchId" TEXT,
    "runById" TEXT,
    "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'PENDING',
    "algorithm" TEXT,
    "parameters" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposedTransactionMatch" (
    "id" TEXT NOT NULL,
    "reconciliationRunId" TEXT NOT NULL,
    "normalizedTransactionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "confidence" "MatchConfidence" NOT NULL DEFAULT 'MEDIUM',
    "score" DECIMAL(5,4),
    "matchCriteria" JSONB,
    "status" "MatchStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProposedTransactionMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reconciliationRunId" TEXT NOT NULL,
    "normalizedTransactionId" TEXT NOT NULL,
    "exceptionType" "ExceptionType" NOT NULL,
    "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "details" JSONB,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanReviewDecision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "normalizedTransactionId" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "decisionType" "ReviewDecisionType" NOT NULL,
    "rationale" TEXT,
    "decisionMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HumanReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "ImportBatch_organizationId_idx" ON "ImportBatch"("organizationId");

-- CreateIndex
CREATE INDEX "ImportBatch_status_idx" ON "ImportBatch"("status");

-- CreateIndex
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ImportedSourceRecord_organizationId_idx" ON "ImportedSourceRecord"("organizationId");

-- CreateIndex
CREATE INDEX "ImportedSourceRecord_importBatchId_idx" ON "ImportedSourceRecord"("importBatchId");

-- CreateIndex
CREATE INDEX "ImportedSourceRecord_transactionDate_idx" ON "ImportedSourceRecord"("transactionDate");

-- CreateIndex
CREATE INDEX "ImportedSourceRecord_externalId_idx" ON "ImportedSourceRecord"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedSourceRecord_importBatchId_rowHash_key" ON "ImportedSourceRecord"("importBatchId", "rowHash");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedTransaction_importedSourceRecordId_key" ON "NormalizedTransaction"("importedSourceRecordId");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_organizationId_idx" ON "NormalizedTransaction"("organizationId");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_importBatchId_idx" ON "NormalizedTransaction"("importBatchId");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_status_idx" ON "NormalizedTransaction"("status");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_transactionDate_idx" ON "NormalizedTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_externalId_idx" ON "NormalizedTransaction"("externalId");

-- CreateIndex
CREATE INDEX "ReconciliationRun_organizationId_idx" ON "ReconciliationRun"("organizationId");

-- CreateIndex
CREATE INDEX "ReconciliationRun_status_idx" ON "ReconciliationRun"("status");

-- CreateIndex
CREATE INDEX "ReconciliationRun_createdAt_idx" ON "ReconciliationRun"("createdAt");

-- CreateIndex
CREATE INDEX "ProposedTransactionMatch_reconciliationRunId_idx" ON "ProposedTransactionMatch"("reconciliationRunId");

-- CreateIndex
CREATE INDEX "ProposedTransactionMatch_normalizedTransactionId_idx" ON "ProposedTransactionMatch"("normalizedTransactionId");

-- CreateIndex
CREATE INDEX "ProposedTransactionMatch_status_idx" ON "ProposedTransactionMatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProposedTransactionMatch_reconciliationRunId_normalizedTran_key" ON "ProposedTransactionMatch"("reconciliationRunId", "normalizedTransactionId", "candidateId");

-- CreateIndex
CREATE INDEX "ReconciliationException_organizationId_idx" ON "ReconciliationException"("organizationId");

-- CreateIndex
CREATE INDEX "ReconciliationException_reconciliationRunId_idx" ON "ReconciliationException"("reconciliationRunId");

-- CreateIndex
CREATE INDEX "ReconciliationException_normalizedTransactionId_idx" ON "ReconciliationException"("normalizedTransactionId");

-- CreateIndex
CREATE INDEX "ReconciliationException_status_idx" ON "ReconciliationException"("status");

-- CreateIndex
CREATE INDEX "HumanReviewDecision_organizationId_idx" ON "HumanReviewDecision"("organizationId");

-- CreateIndex
CREATE INDEX "HumanReviewDecision_normalizedTransactionId_idx" ON "HumanReviewDecision"("normalizedTransactionId");

-- CreateIndex
CREATE INDEX "HumanReviewDecision_reviewedById_idx" ON "HumanReviewDecision"("reviewedById");

-- CreateIndex
CREATE INDEX "HumanReviewDecision_createdAt_idx" ON "HumanReviewDecision"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_idx" ON "AuditEvent"("organizationId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_idx" ON "AuditEvent"("entityType");

-- CreateIndex
CREATE INDEX "AuditEvent_occurredAt_idx" ON "AuditEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedSourceRecord" ADD CONSTRAINT "ImportedSourceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedSourceRecord" ADD CONSTRAINT "ImportedSourceRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedTransaction" ADD CONSTRAINT "NormalizedTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedTransaction" ADD CONSTRAINT "NormalizedTransaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedTransaction" ADD CONSTRAINT "NormalizedTransaction_importedSourceRecordId_fkey" FOREIGN KEY ("importedSourceRecordId") REFERENCES "ImportedSourceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRun" ADD CONSTRAINT "ReconciliationRun_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedTransactionMatch" ADD CONSTRAINT "ProposedTransactionMatch_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "ReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposedTransactionMatch" ADD CONSTRAINT "ProposedTransactionMatch_normalizedTransactionId_fkey" FOREIGN KEY ("normalizedTransactionId") REFERENCES "NormalizedTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "ReconciliationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_normalizedTransactionId_fkey" FOREIGN KEY ("normalizedTransactionId") REFERENCES "NormalizedTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationException" ADD CONSTRAINT "ReconciliationException_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReviewDecision" ADD CONSTRAINT "HumanReviewDecision_normalizedTransactionId_fkey" FOREIGN KEY ("normalizedTransactionId") REFERENCES "NormalizedTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReviewDecision" ADD CONSTRAINT "HumanReviewDecision_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReviewDecision" ADD CONSTRAINT "HumanReviewDecision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
