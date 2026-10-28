import { createElement, type AnchorHTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrisma: vi.fn(),
  getOrganizationWorkspace: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));
vi.mock("@/lib/workspace", () => ({
  getOrganizationWorkspace: mocks.getOrganizationWorkspace,
  formatDate: (date: Date) => date.toISOString(),
  formatMoney: (amount: number | string, currency: string) =>
    `${currency} ${amount}`,
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement("a", { ...props, href }),
}));

import OrganizationDashboard from "@/app/dashboard/[organizationId]/page";
import ReconciliationPage from "@/app/dashboard/[organizationId]/reconciliation/page";

const database = {
  importBatch: { count: vi.fn(), findMany: vi.fn() },
  normalizedTransaction: {
    count: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  reconciliationException: { count: vi.fn() },
  reconciliationRun: { findFirst: vi.fn() },
  importedSourceRecord: { findMany: vi.fn() },
};

const workspace = {
  id: "user-1",
  email: "member@example.test",
  isActive: true,
  sessionVersion: 0,
  organizationId: "org-1",
  role: "OPERATOR" as const,
  organization: { id: "org-1", name: "North Properties", currency: "KES" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrganizationWorkspace.mockResolvedValue(workspace);
  mocks.getPrisma.mockReturnValue(database);
  database.importBatch.count.mockResolvedValue(0);
  database.importBatch.findMany.mockResolvedValue([]);
  database.normalizedTransaction.count.mockResolvedValue(0);
  database.normalizedTransaction.aggregate.mockResolvedValue({
    _sum: { amount: null },
  });
  database.normalizedTransaction.findMany.mockResolvedValue([]);
  database.reconciliationException.count.mockResolvedValue(0);
  database.reconciliationRun.findFirst.mockResolvedValue(null);
  database.importedSourceRecord.findMany.mockResolvedValue([]);
});

describe("organization workspace screens", () => {
  it("renders a truthful dashboard empty state using tenant-scoped data", async () => {
    const element = await OrganizationDashboard({
      params: Promise.resolve({ organizationId: "org-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("North Properties");
    expect(html).toContain("No imports yet");
    expect(html).toContain("No reconciliation runs recorded");
    expect(html).toContain(
      "This organization has no imported financial records yet.",
    );
    expect(database.importBatch.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
    expect(database.normalizedTransaction.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
    });
  });

  it("renders totals and exception counts from returned records", async () => {
    database.importBatch.count.mockResolvedValue(2);
    database.normalizedTransaction.count.mockResolvedValue(3);
    database.reconciliationException.count.mockResolvedValue(1);
    database.importBatch.findMany.mockResolvedValue([
      {
        id: "batch-1",
        filename: "ledger.csv",
        status: "COMPLETED",
        createdAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    ]);
    database.reconciliationRun.findFirst.mockResolvedValue({
      id: "run-1",
      status: "COMPLETED",
      createdAt: new Date("2026-10-02T00:00:00.000Z"),
    });
    database.normalizedTransaction.aggregate
      .mockResolvedValueOnce({
        _sum: { amount: { toString: () => "1200.50" } },
      })
      .mockResolvedValueOnce({
        _sum: { amount: { toString: () => "300.00" } },
      });

    const element = await OrganizationDashboard({
      params: Promise.resolve({ organizationId: "org-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("1200.50");
    expect(html).toContain("300.00");
    expect(html).toContain("1 unresolved exception");
    expect(html).toContain("ledger.csv");
    expect(html).not.toContain("No imports yet");
  });

  it("applies the selected transaction filter within the authorized organization", async () => {
    const element = await ReconciliationPage({
      params: Promise.resolve({ organizationId: "org-1" }),
      searchParams: Promise.resolve({ filter: "unmatched" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("No matching transactions");
    expect(database.normalizedTransaction.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1", status: "UNRECONCILED" },
    });
    expect(database.normalizedTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", status: "UNRECONCILED" },
        take: 30,
        skip: 0,
      }),
    );
  });
});
