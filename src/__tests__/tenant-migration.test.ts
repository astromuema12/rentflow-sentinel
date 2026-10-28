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
    "20261028100000_rental_marketplace",
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

  it("creates renter accounts, rental listings, saved homes, and enquiries", async () => {
    await database!.exec(`
      INSERT INTO "User" ("id", "email", "passwordHash", "accountType", "updatedAt")
      VALUES ('renter-a', 'renter@test.invalid', 'test-only-hash', 'RENTER', now());

      INSERT INTO "RentalListing"
        ("id", "organizationId", "createdById", "title", "description", "county", "town", "neighborhood",
         "price", "pricePeriod", "bedrooms", "bathrooms", "imageUrls", "updatedAt")
      VALUES
        ('rental-a', 'org-a', 'user-a', 'A quiet home', 'A comfortable home near local shops and transport.',
         'Nairobi City', 'Nairobi', 'Kilimani', 50000, 'MONTHLY', 2, 1, ARRAY[]::TEXT[], now());

      INSERT INTO "SavedRentalListing" ("userId", "listingId")
      VALUES ('renter-a', 'rental-a');

      INSERT INTO "RentalEnquiry" ("id", "listingId", "renterId", "message", "updatedAt")
      VALUES ('enquiry-a', 'rental-a', 'renter-a', 'Is the home available next month?', now());
    `);

    const accounts = await database!.query(
      `SELECT "accountType"::text FROM "User" WHERE "id" IN ('user-a', 'renter-a') ORDER BY "id"`,
    );
    const listing = await database!.query(
      `SELECT "status"::text FROM "RentalListing" WHERE "id" = 'rental-a'`,
    );
    const savedHomes = await database!.query(
      `SELECT count(*)::int AS count FROM "SavedRentalListing" WHERE "userId" = 'renter-a'`,
    );
    const enquiries = await database!.query(
      `SELECT count(*)::int AS count FROM "RentalEnquiry" WHERE "renterId" = 'renter-a'`,
    );

    expect(accounts.rows).toEqual([
      { accountType: "RENTER" },
      { accountType: "LANDLORD" },
    ]);
    expect(listing.rows).toEqual([{ status: "DRAFT" }]);
    expect(savedHomes.rows).toEqual([{ count: 1 }]);
    expect(enquiries.rows).toEqual([{ count: 1 }]);
  });
});
