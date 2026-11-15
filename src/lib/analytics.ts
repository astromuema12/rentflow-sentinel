export const analyticsRanges = ["7d", "30d", "90d", "all"] as const;

export type AnalyticsRange = (typeof analyticsRanges)[number];

export function isAnalyticsRange(value: string): value is AnalyticsRange {
  return analyticsRanges.some((range) => range === value);
}

export function getAnalyticsWindow(range: AnalyticsRange, now: Date) {
  const daysByRange = { "7d": 7, "30d": 30, "90d": 90, all: 0 };
  const labels = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    all: "All time",
  };
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const days = daysByRange[range];

  if (days > 0) {
    start.setUTCDate(start.getUTCDate() - days + 1);
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + (days > 0 ? days : 1));

  return {
    days,
    label: labels[range],
    start: days > 0 ? start : undefined,
    end,
  };
}
