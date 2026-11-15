import { Download, FileBarChart, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import {
  getAnalyticsWindow,
  isAnalyticsRange,
  type AnalyticsRange,
} from "@/lib/analytics";
import { formatMoney, getOrganizationWorkspace } from "@/lib/workspace";

const rangeOptions = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "All" },
] as const satisfies readonly { key: AnalyticsRange; label: string }[];

type TrendBucket = { label: string; start: Date; end: Date; value: number };

function createTrendBuckets(range: AnalyticsRange, now: Date): TrendBucket[] {
  if (range === "all") {
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
      );
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 4 + index, 1),
      );
      return {
        label: new Intl.DateTimeFormat("en-KE", {
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        }).format(start),
        start,
        end,
        value: 0,
      };
    });
  }

  const { days, start } = getAnalyticsWindow(range, now);
  const bucketCount = range === "7d" ? 7 : 6;
  const firstDay = start!;
  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(firstDay);
    bucketStart.setUTCDate(
      bucketStart.getUTCDate() + Math.floor((index * days) / bucketCount),
    );
    const bucketEnd = new Date(firstDay);
    bucketEnd.setUTCDate(
      bucketEnd.getUTCDate() + Math.ceil(((index + 1) * days) / bucketCount),
    );
    return {
      label: new Intl.DateTimeFormat("en-KE", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(bucketStart),
      start: bucketStart,
      end: bucketEnd,
      value: 0,
    };
  });
}

function bucketIndexForDate(date: Date, buckets: TrendBucket[]) {
  return buckets.findIndex(
    (bucket) => date >= bucket.start && date < bucket.end,
  );
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ window?: string }>;
}) {
  const { organizationId } = await params;
  const query = await searchParams;
  const selectedRange: AnalyticsRange =
    query.window && isAnalyticsRange(query.window) ? query.window : "30d";
  const { organization } = await getOrganizationWorkspace(organizationId);
  const prisma = getPrisma();
  const currentDate = new Date();
  const windowConfig = getAnalyticsWindow(selectedRange, currentDate);
  const chartWindowLabel =
    selectedRange === "all" ? "Last 6 months" : windowConfig.label;
  const dateFilter = windowConfig.start
    ? { gte: windowConfig.start, lt: windowConfig.end }
    : undefined;

  const [
    transactions,
    exceptions,
    listingStatusSummary,
    enquiryStatusSummary,
    countySummary,
    topListings,
    recentListings,
    revenueByDate,
    savedPropertyCount,
    respondedEnquiryCount,
  ] = await Promise.all([
    prisma.normalizedTransaction.groupBy({
      by: ["status", "type"],
      where: { organizationId },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.reconciliationException.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.rentalListing.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.rentalEnquiry.groupBy({
      by: ["status"],
      where: { listing: { organizationId } },
      _count: { _all: true },
    }),
    prisma.rentalListing.groupBy({
      by: ["county"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.rentalListing.findMany({
      where: { organizationId },
      select: {
        id: true,
        title: true,
        county: true,
        price: true,
        pricePeriod: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        _count: {
          select: {
            enquiries: true,
            savedBy: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
    }),
    prisma.rentalListing.findMany({
      where: { organizationId, createdAt: dateFilter },
      select: { createdAt: true },
    }),
    prisma.normalizedTransaction.groupBy({
      by: ["transactionDate", "type"],
      where: {
        organizationId,
        currency: organization.currency,
        ...(dateFilter
          ? {
              transactionDate: {
                gte: dateFilter.gte,
                lt: dateFilter.lt,
              },
            }
          : {}),
      },
      _sum: { amount: true },
    }),
    prisma.savedRentalListing.count({
      where: { listing: { organizationId } },
    }),
    prisma.rentalEnquiry.count({
      where: {
        listing: { organizationId },
        respondedAt: { not: null },
      },
    }),
  ]);

  const totalTransactions = transactions.reduce(
    (sum, group) => sum + (group._count?._all ?? 0),
    0,
  );
  const openExceptionGroup = exceptions.find(
    (group) => group.status === "OPEN",
  );
  const openExceptions = openExceptionGroup
    ? (openExceptionGroup._count?._all ?? 0)
    : 0;
  const totalListings = listingStatusSummary.reduce(
    (sum, group) => sum + (group._count?._all ?? 0),
    0,
  );
  const publishedListingGroup = listingStatusSummary.find(
    (group) => group.status === "PUBLISHED",
  );
  const publishedListings = publishedListingGroup
    ? (publishedListingGroup._count?._all ?? 0)
    : 0;
  const totalEnquiries = enquiryStatusSummary.reduce(
    (sum, group) => sum + (group._count?._all ?? 0),
    0,
  );
  const responseRate = totalEnquiries
    ? Math.round((respondedEnquiryCount / totalEnquiries) * 100)
    : 0;

  const pendingReviewGroup = listingStatusSummary.find(
    (group) => group.status === "PENDING_REVIEW",
  );
  const countyRanking = [...countySummary]
    .sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0))
    .slice(0, 5);
  const activityBuckets = createTrendBuckets(selectedRange, currentDate);
  for (const listing of recentListings) {
    const bucketIndex = bucketIndexForDate(listing.createdAt, activityBuckets);
    if (bucketIndex >= 0) activityBuckets[bucketIndex].value += 1;
  }
  const maxTrendValue = Math.max(
    ...activityBuckets.map((item) => item.value),
    1,
  );
  const chartBars = activityBuckets.map((point) => ({
    ...point,
    height: `${(point.value / maxTrendValue) * 100}%`,
  }));
  const revenueBuckets = createTrendBuckets(selectedRange, currentDate).map(
    (bucket) => ({ ...bucket, incoming: 0, outgoing: 0 }),
  );
  for (const group of revenueByDate) {
    const bucketIndex = bucketIndexForDate(
      group.transactionDate,
      revenueBuckets,
    );
    if (bucketIndex < 0) continue;
    const amount = Number(group._sum.amount?.toString() ?? "0");
    if (group.type === "CREDIT") {
      revenueBuckets[bucketIndex].incoming += amount;
    } else {
      revenueBuckets[bucketIndex].outgoing += amount;
    }
  }
  const maxRevenue = Math.max(
    ...revenueBuckets.flatMap((bucket) => [bucket.incoming, bucket.outgoing]),
    1,
  );
  const revenueChartBars = revenueBuckets.map((bucket) => ({
    ...bucket,
    incomingHeight: `${(bucket.incoming / maxRevenue) * 100}%`,
    outgoingHeight: `${(bucket.outgoing / maxRevenue) * 100}%`,
  }));

  const listingAnalytics = [
    {
      label: "Portfolio listings",
      value: String(totalListings),
      detail: `${publishedListings} live on the marketplace`,
    },
    {
      label: "Transaction records",
      value: String(totalTransactions),
      detail: `${openExceptions} exceptions still open`,
    },
    {
      label: "Active enquiries",
      value: String(totalEnquiries),
      detail: `${responseRate}% responded`,
    },
    {
      label: "Saved properties",
      value: String(savedPropertyCount),
      detail: "Across your organization’s listings",
    },
    {
      label: "Pending review",
      value: String(
        pendingReviewGroup ? (pendingReviewGroup._count?._all ?? 0) : 0,
      ),
      detail: "Awaiting moderator approval",
    },
  ];

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">OPERATIONS SUMMARY</p>
          <h1>Reports & analytics</h1>
          <p className="page-subtitle">
            Portfolio visibility for rental demand, listing health, and
            transaction activity.
          </p>
        </div>
        <a
          className="button button-primary"
          href={`/api/organizations/${organizationId}/exports?window=${selectedRange}`}
        >
          <Download size={16} aria-hidden="true" /> Export transactions (CSV)
        </a>
      </header>

      <section className="report-callout">
        <TrendingUp size={20} aria-hidden="true" />
        <p>
          These metrics combine live rental performance with the current
          imported ledger data for this organization.
        </p>
      </section>

      <nav className="range-tabs" aria-label="Analytics date range">
        {rangeOptions.map((option) => (
          <Link
            aria-current={selectedRange === option.key ? "page" : undefined}
            className={
              selectedRange === option.key
                ? "range-tab is-current"
                : "range-tab"
            }
            href={`/dashboard/${organizationId}/reports?window=${option.key}`}
            key={option.key}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <section
        className="summary-grid summary-grid-four"
        aria-label="Portfolio analytics"
      >
        {listingAnalytics.map((item) => (
          <article key={item.label} className="summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">TRAFFIC</p>
            <h2>Listing growth</h2>
          </div>
          <span className="panel-subtitle">{chartWindowLabel}</span>
        </div>
        <div
          className="trend-chart"
          style={{
            gridTemplateColumns: `repeat(${chartBars.length}, minmax(0, 1fr))`,
          }}
          role="img"
          aria-label={`Listings added during ${chartWindowLabel}: ${activityBuckets.reduce(
            (total, bucket) => total + bucket.value,
            0,
          )} total`}
        >
          {chartBars.map((bar) => (
            <div className="trend-bar-group" key={bar.label}>
              <div
                className="trend-bar"
                style={{ height: bar.height }}
                title={`${bar.label}: ${bar.value} listing${
                  bar.value === 1 ? "" : "s"
                }`}
              />
              <span>{bar.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CASH FLOW</p>
            <h2>Credits and debits</h2>
          </div>
          <span className="panel-subtitle">{organization.currency}</span>
        </div>
        {revenueBuckets.some(
          (bucket) => bucket.incoming > 0 || bucket.outgoing > 0,
        ) ? (
          <>
            <div
              className="revenue-chart"
              style={{
                gridTemplateColumns: `repeat(${revenueChartBars.length}, minmax(0, 1fr))`,
              }}
              role="img"
              aria-label={`Credits and debits for ${chartWindowLabel} in ${
                organization.currency
              }: ${formatMoney(
                revenueBuckets.reduce((total, bucket) => total + bucket.incoming, 0),
                organization.currency,
              )} credits, ${formatMoney(
                revenueBuckets.reduce((total, bucket) => total + bucket.outgoing, 0),
                organization.currency,
              )} debits`}
            >
              {revenueChartBars.map((bar) => (
                <div className="revenue-bar-group" key={bar.label}>
                  <div className="revenue-bars">
                    <div
                      className="revenue-bar revenue-bar--credit"
                      style={{ height: bar.incomingHeight }}
                      title={`${bar.label} credits: ${formatMoney(
                        bar.incoming,
                        organization.currency,
                      )}`}
                    />
                    <div
                      className="revenue-bar revenue-bar--debit"
                      style={{ height: bar.outgoingHeight }}
                      title={`${bar.label} debits: ${formatMoney(
                        bar.outgoing,
                        organization.currency,
                      )}`}
                    />
                  </div>
                  <span>{bar.label}</span>
                </div>
              ))}
            </div>
            <div className="revenue-legend">
              <span>
                <i className="revenue-legend-credit" /> Credits
              </span>
              <span>
                <i className="revenue-legend-debit" /> Debits
              </span>
            </div>
          </>
        ) : (
          <p className="quiet-state">
            No transaction activity exists for this date range.
          </p>
        )}
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PORTFOLIO</p>
              <h2>Listing status</h2>
            </div>
          </div>
          {listingStatusSummary.length ? (
            <ul className="report-status-list">
              {listingStatusSummary.map((group) => (
                <li key={group.status}>
                  <span
                    className={`status-pill status-${group.status.toLowerCase()}`}
                  >
                    {group.status.replaceAll("_", " ")}
                  </span>
                  <strong>{group._count?._all ?? 0}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-state">No listings have been created yet.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">MARKET DEMAND</p>
              <h2>Top counties</h2>
            </div>
          </div>
          {countyRanking.length ? (
            <ul className="report-status-list">
              {countyRanking.map((group) => (
                <li key={group.county}>
                  <span>{group.county}</span>
                  <strong>{group._count?._all ?? 0}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="quiet-state">
              No listing data exists for this organization yet.
            </p>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">MOST ENGAGED</p>
            <h2>Recent listing performance</h2>
          </div>
        </div>
        {topListings.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>County</th>
                  <th>Enquiries</th>
                  <th>Saved</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topListings.map((listing) => (
                  <tr key={listing.id}>
                    <td>{listing.title}</td>
                    <td>{listing.county}</td>
                    <td>{listing._count.enquiries}</td>
                    <td>{listing._count.savedBy}</td>
                    <td>
                      <span
                        className={`status-pill status-${listing.status.toLowerCase()}`}
                      >
                        {listing.status.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <TrendingUp size={24} />
            <h3>No listing engagement yet</h3>
            <p>
              Listings will appear here once they are published and users begin
              interacting with them.
            </p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REPORT PREVIEW</p>
            <h2>Transactions by status</h2>
          </div>
          <span className="panel-subtitle">{organization.currency}</span>
        </div>
        {transactions.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Transaction type</th>
                  <th>Records</th>
                  <th>Recorded total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((group) => (
                  <tr key={`${group.status}-${group.type}`}>
                    <td>
                      <span
                        className={`status-pill status-${group.status.toLowerCase()}`}
                      >
                        {group.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      {group.type === "CREDIT"
                        ? "Credits received"
                        : "Debits paid"}
                    </td>
                    <td>{group._count?._all ?? 0}</td>
                    <td>
                      {formatMoney(
                        group._sum.amount?.toString() ?? "0",
                        organization.currency,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FileBarChart size={24} />
            <h3>No report data yet</h3>
            <p>
              When this organization has transaction records, this report will
              summarize them without treating suggestions as confirmed matches.
            </p>
          </div>
        )}
      </section>
      <section className="panel report-exceptions">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">REVIEW STATUS</p>
            <h2>Exceptions</h2>
          </div>
        </div>
        {exceptions.length ? (
          <ul className="report-status-list">
            {exceptions.map((group) => (
              <li key={group.status}>
                <span
                  className={`status-pill status-${group.status.toLowerCase()}`}
                >
                  {group.status}
                </span>
                <strong>{group._count?._all ?? 0}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="quiet-state">
            No exception records have been recorded.
          </p>
        )}
      </section>
      <p className="footnote">
        Export contains transaction records scoped to this organization. CSV is
        the currently supported report format.
      </p>
    </div>
  );
}
