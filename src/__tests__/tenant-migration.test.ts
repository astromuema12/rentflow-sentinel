// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

let database: PGlite | undefined;

beforeAll(async () => {
  database = new PGlite();
  const migrationRoot = join(process.cwd(), "prisma", "migrations");

  for (const migrationName of [
    "20260101000000_init_rentflow_sentinel",
    "20261027100000_auth_security",
  ]) {
    const sql = await readFile(
      join(migrationRoot, migrationName, "migration.sql"),
      "utf8",
    );
    await database.exec(sql);
  }

  await database.exec(`
    INSERT INTO "Organization" ("id", "name", "slug", "updatedAt")
    VALUES ('org-a', 'Org A', 'org-a', now()), ('org-b', 'Org B', 'org-b', now());

    INSERT INTO "ImportBatch" ("id", "organizationId", "filename", "sourceType", "updatedAt")
    VALUES ('batch-a', 'org-a', 'a.csv', 'csv', now()), ('batch-b', 'org-b', 'b.csv', 'csv', now());

    INSERT INTO "ImportedSourceRecord"
      ("id", "organizationId", "importBatchId", "rowHash", "rawData", "amount", "transactionDate", "updatedAt")
    VALUES
      ('source-a', 'org-a', 'batch-a', 'hash-a', '{}'::jsonb, 10, '2026-01-01', now()),
      ('source-b', 'org-b', 'batch-b', 'hash-b', '{}'::jsonb, 10, '2026-01-01', now());

    INSERT INTO "NormalizedTransaction"
      ("id", "organizationId", "importedSourceRecordId", "type", "amount", "transactionDate", "updatedAt")
    VALUES
      ('tx-a', 'org-a', 'source-a', 'CREDIT', 10, '2026-01-01', now()),
      ('tx-b', 'org-b', 'source-b', 'CREDIT', 10, '2026-01-01', now());

    INSERT INTO "ReconciliationRun" ("id", "organizationId", "updatedAt")
    VALUES ('run-a', 'org-a', now());

    INSERT INTO "User" ("id", "email", "passwordHash", "updatedAt")
    VALUES ('user-a', 'a@test.invalid', 'test-only-hash', now());
  `);
});

afterAll(async () => {
  await database?.close();
});

describe("tenant-aware database constraints", () => {
  it("allows valid same-organization relationships", async () => {
    const result = await database!.query(
      `SELECT "id" FROM "NormalizedTransaction"
       WHERE "id" = $1 AND "organizationId" = $2`,
      ["tx-a", "org-a"],
    );

    expect(result.rows).toEqual([{ id: "tx-a" }]);
  });

  it.each([
    [
      "import records to batches",
      `INSERT INTO "ImportedSourceRecord"
        ("id", "organizationId", "importBatchId", "rowHash", "rawData", "amount", "transactionDate", "updatedAt")
       VALUES ('bad-source', 'org-a', 'batch-b', 'bad-hash', '{}'::jsonb, 10, '2026-01-01', now())`,
    ],
    [
      "transactions to import batches",
      `INSERT INTO "NormalizedTransaction"
        ("id", "organizationId", "importBatchId", "type", "amount", "transactionDate", "updatedAt")
       VALUES ('bad-transaction', 'org-a', 'batch-b', 'CREDIT', 10, '2026-01-01', now())`,
    ],
    [
      "proposed matches to runs and transactions",
      `INSERT INTO "ProposedTransactionMatch"
        ("id", "organizationId", "reconciliationRunId", "normalizedTransactionId", "candidateId", "updatedAt")
       VALUES ('bad-match', 'org-a', 'run-a', 'tx-b', 'candidate', now())`,
    ],
    [
      "exceptions to runs and transactions",
      `INSERT INTO "ReconciliationException"
        ("id", "organizationId", "reconciliationRunId", "normalizedTransactionId", "exceptionType", "updatedAt")
       VALUES ('bad-exception', 'org-a', 'run-a', 'tx-b', 'OTHER', now())`,
    ],
    [
      "review decisions to transactions",
      `INSERT INTO "HumanReviewDecision"
        ("id", "organizationId", "normalizedTransactionId", "reviewedById", "decisionType")
       VALUES ('bad-review', 'org-a', 'tx-b', 'user-a', 'COMMENT')`,
    ],
  ])("rejects cross-organization references from %s", async (_label, sql) => {
    await expect(database!.exec(sql)).rejects.toMatchObject({ code: "23503" });
  });
});
