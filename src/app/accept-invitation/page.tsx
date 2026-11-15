import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RentFlowLogo } from "@/components/rentflow-logo";
import { AcceptInvitationForm } from "./accept-invitation-form";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function AcceptInvitationPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="invitation-title">
        <Link className="auth-brand" href="/">
          <RentFlowLogo label="PROPERTY PARTNER" />
        </Link>
        <p className="eyebrow">PROPERTY PARTNER INVITATION</p>
        <h1 id="invitation-title">Set up your landlord account</h1>
        <p className="auth-intro">
          Choose a password to accept your organization invitation. Invitation
          links expire after seven days and can only be used once.
        </p>
        <Suspense
          fallback={<p className="auth-intro">Loading invitation form...</p>}
        >
          <AcceptInvitationForm />
        </Suspense>
        <Link className="auth-secondary-link" href="/sign-in">
          Already have an account? Sign in
        </Link>
      </section>
    </main>
  );
}
