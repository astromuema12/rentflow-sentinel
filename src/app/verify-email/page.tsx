import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RentFlowLogo } from "@/components/rentflow-logo";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="verify-email-title">
        <Link className="auth-brand" href="/">
          <RentFlowLogo label="RENTER" />
        </Link>
        <p className="eyebrow">VERIFY YOUR EMAIL</p>
        <h1 id="verify-email-title">Finish creating your account</h1>
        <p className="auth-intro">
          Choose a password to verify your email and activate your renter
          account. This link expires after 24 hours and can only be used once.
        </p>
        <Suspense
          fallback={<p className="auth-intro">Loading verification form...</p>}
        >
          <VerifyEmailForm />
        </Suspense>
        <Link className="auth-secondary-link" href="/register">
          Request another verification link
        </Link>
      </section>
    </main>
  );
}
