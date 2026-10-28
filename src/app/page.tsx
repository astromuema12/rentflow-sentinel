import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleHelp,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const setupSteps = [
  {
    number: "01",
    title: "Bring in your records",
    description:
      "Start with a rent ledger, bank statement, or M-Pesa export in CSV format.",
    icon: FileSpreadsheet,
  },
  {
    number: "02",
    title: "Review suggested matches",
    description:
      "Compare rent expected with payments received and focus on items that need attention.",
    icon: BadgeCheck,
  },
  {
    number: "03",
    title: "Keep a clear audit trail",
    description:
      "Record decisions so your team can understand what changed and why.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="workspace" id="overview">
      <header className="topbar">
        <a
          className="brand"
          href="#overview"
          aria-label="RentFlow Sentinel home"
        >
          <span className="brand-mark" aria-hidden="true">
            <Building2 size={20} strokeWidth={2.2} />
          </span>
          <span className="brand-name">
            RentFlow <span>Sentinel</span>
          </span>
        </a>

        <div className="topbar-meta">
          <span className="region-label">
            <span className="status-dot" />
            KENYA · KES
          </span>
          <a
            aria-label="Getting started"
            className="help-link"
            href="#getting-started"
          >
            <CircleHelp size={17} />
            <span>Getting started</span>
          </a>
          <Link className="help-link" href="/sign-in">
            Sign in
          </Link>
        </div>
      </header>

      <div className="page-content">
        <section className="welcome" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="eyebrow">YOUR FINANCE WORKSPACE</p>
            <h1 id="welcome-title">Reconciliation, without the guesswork.</h1>
            <p className="welcome-description">
              Bring rent records and payment statements together, review what
              matches, and keep every decision traceable.
            </p>
            <a className="primary-link" href="#getting-started">
              See how to get started
              <ArrowRight size={17} />
            </a>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-glow" />
            <div className="art-card art-card-back">
              <span className="art-line art-line-short" />
              <span className="art-line" />
              <span className="art-line art-line-medium" />
            </div>
            <div className="art-card art-card-front">
              <span className="art-icon">
                <BadgeCheck size={23} />
              </span>
              <span className="art-label">RECORDS IN SYNC</span>
              <span className="art-amount">KES —</span>
              <span className="art-line art-line-short" />
            </div>
          </div>
        </section>

        <section className="overview-section" aria-labelledby="overview-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h2 id="overview-title">Your reconciliation snapshot</h2>
            </div>
            <span className="empty-badge">AWAITING FIRST IMPORT</span>
          </div>

          <div className="metrics-grid">
            <article className="metric-card">
              <div className="metric-label">
                <span>RECORDS REVIEWED</span>
                <FileSpreadsheet size={17} />
              </div>
              <p className="metric-value">—</p>
              <p className="metric-note">Available after your first import</p>
            </article>
            <article className="metric-card">
              <div className="metric-label">
                <span>MATCHED PAYMENTS</span>
                <BadgeCheck size={17} />
              </div>
              <p className="metric-value">—</p>
              <p className="metric-note">
                Suggested matches are reviewed by you
              </p>
            </article>
            <article className="metric-card">
              <div className="metric-label">
                <span>OPEN EXCEPTIONS</span>
                <ShieldCheck size={17} />
              </div>
              <p className="metric-value">—</p>
              <p className="metric-note">
                Items needing attention will appear here
              </p>
            </article>
          </div>
        </section>

        <section
          className="getting-started"
          id="getting-started"
          aria-labelledby="getting-started-title"
        >
          <div className="getting-started-heading">
            <div>
              <p className="eyebrow">A SIMPLE FIRST RUN</p>
              <h2 id="getting-started-title">
                Start with the records you have
              </h2>
            </div>
            <span className="step-count">3 STEPS</span>
          </div>

          <div className="steps-grid">
            {setupSteps.map(({ number, title, description, icon: Icon }) => (
              <article className="step-card" key={number}>
                <div className="step-topline">
                  <span className="step-number">{number}</span>
                  <Icon size={19} aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>

          <div className="import-note">
            <span className="import-note-icon" aria-hidden="true">
              <ArrowDownToLine size={19} />
            </span>
            <p>
              <strong>No records have been imported yet.</strong> Your overview
              will update when a statement import is available.
            </p>
          </div>
        </section>

        <footer className="page-footer">
          <span>RENTFLOW SENTINEL</span>
          <span>Rental finance, made clearer.</span>
        </footer>
      </div>
    </main>
  );
}
