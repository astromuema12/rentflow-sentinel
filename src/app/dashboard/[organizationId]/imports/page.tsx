import { FileClock, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { formatDate, getOrganizationWorkspace } from "@/lib/workspace";

const PAGE_SIZE = 25;

export default async function ImportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { organizationId } = await params;
  const query = await searchParams;
  const parsedPage = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const { organization } = await getOrganizationWorkspace(organizationId);
  const prisma = getPrisma();
  const total = await prisma.importBatch.count({ where: { organizationId } });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const batches = await prisma.importBatch.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      filename: true,
      sourceType: true,
      status: true,
      createdAt: true,
      completedAt: true,
      _count: { select: { importedRecords: true } },
    },
  });

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">DATA INTAKE</p>
          <h1>Imports</h1>
          <p className="page-subtitle">
            Import history and source record processing for {organization.name}.
          </p>
        </div>
        <Link
          className="button button-primary"
          href={`/dashboard/${organizationId}/imports/upload`}
        >
          <Upload size={16} aria-hidden="true" /> Upload CSV
        </Link>
      </header>
      {batches.length ? (
        <>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Import history</h2>
                <p className="panel-subtitle">
                  {total} {total === 1 ? "batch" : "batches"}
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Source file</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Source rows</th>
                    <th>Started</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <Link
                          className="table-link"
                          href={`/dashboard/${organizationId}/imports/${batch.id}`}
                        >
                          {batch.filename}
                        </Link>
                      </td>
                      <td>{batch.sourceType.replaceAll("_", " ")}</td>
                      <td>
                        <span
                          className={`status-pill status-${batch.status.toLowerCase()}`}
                        >
                          {batch.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>{batch._count.importedRecords}</td>
                      <td>{formatDate(batch.createdAt)}</td>
                      <td>
                        {batch.completedAt
                          ? formatDate(batch.completedAt)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <nav className="pagination" aria-label="Import history pages">
            <span>
              Page {safePage} of {pageCount}
            </span>
            {safePage > 1 ? (
              <Link
                href={`/dashboard/${organizationId}/imports?page=${safePage - 1}`}
              >
                <ChevronLeft size={16} /> Previous
              </Link>
            ) : (
              <span aria-disabled="true">
                <ChevronLeft size={16} /> Previous
              </span>
            )}
            {safePage < pageCount ? (
              <Link
                href={`/dashboard/${organizationId}/imports?page=${safePage + 1}`}
              >
                Next <ChevronRight size={16} />
              </Link>
            ) : (
              <span aria-disabled="true">
                Next <ChevronRight size={16} />
              </span>
            )}
          </nav>
        </>
      ) : (
        <div className="panel empty-state">
          <FileClock size={25} aria-hidden="true" />
          <h2>No import batches</h2>
          <p>
            Add a CSV export from your bank or property ledger to start building
            your portfolio activity history.
          </p>
        </div>
      )}
    </div>
  );
}
