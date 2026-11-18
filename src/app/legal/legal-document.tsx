import Link from "next/link";
import { RentFlowLogo } from "@/components/rentflow-logo";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export function LegalDocument({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="market-brand" href="/" aria-label="RentFlow home">
          <RentFlowLogo />
        </Link>
        <nav aria-label="Legal navigation">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/cookies">Cookies</Link>
          <Link href="/legal/disclaimer">Disclaimer</Link>
          <Link href="/legal/listing-standards">Listing standards</Link>
          <Link href="/legal/acceptable-use">Acceptable use</Link>
        </nav>
        <Link className="legal-sign-in" href="/sign-in">
          Sign in
        </Link>
      </header>

      <article className="legal-document">
        <Link className="legal-back-link" href="/">
          ← Back to RentFlow
        </Link>
        <p className="market-kicker">RENTFLOW KENYA · LEGAL</p>
        <h1>{title}</h1>
        <p className="legal-summary">{summary}</p>
        <p className="legal-updated">Last updated: 18 November 2026</p>

        <aside className="legal-review-notice">
          <strong>Publication check required</strong>
          <p>
            This draft reflects the current RentFlow feature set and is not
            legal advice. Before public launch, RentFlow must publish its
            registered legal entity and address, document its actual data
            processors and retention/deletion practices, and have these policies
            reviewed by Kenyan counsel.
          </p>
          <p>
            Contact RentFlow at{" "}
            <a href="mailto:musauedwin2004@gmail.com">
              musauedwin2004@gmail.com
            </a>{" "}
            or <a href="tel:+254797954565">+254797954565</a>.
          </p>
        </aside>

        <div className="legal-sections">
          {sections.map((section, index) => (
            <section key={section.heading}>
              <span className="legal-section-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <footer className="legal-footer">
          <Link className="market-footer-brand" href="/">
            RENTFLOW <span>·</span> KENYA
          </Link>
          <div>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <Link href="/legal/disclaimer">Disclaimer</Link>
            <Link href="/legal/listing-standards">Listing standards</Link>
            <Link href="/legal/acceptable-use">Acceptable use</Link>
          </div>
          <Link href="/sign-in">Sign in</Link>
        </footer>
      </article>
    </main>
  );
}
