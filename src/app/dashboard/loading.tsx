export default function DashboardLoading() {
  return (
    <main className="organization-picker-content" aria-live="polite">
      <p className="eyebrow">YOUR WORKSPACE</p>
      <h1>Loading your organizations</h1>
      <p className="page-subtitle">
        Checking your current organization access…
      </p>
      <div className="loading-skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
