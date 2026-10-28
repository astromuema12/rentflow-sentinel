import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";
import type { Metadata } from "next";
import { RentFlowLogo } from "@/components/rentflow-logo";

export const metadata: Metadata = {
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-title">
        <Link className="auth-brand" href="/">
          <RentFlowLogo label="PROPERTY PARTNER" />
        </Link>
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1 id="reset-title">Choose a new password</h1>
        <p className="auth-intro">
          Reset links expire after 30 minutes and can only be used once.
        </p>
        <Suspense
          fallback={<p className="auth-intro">Loading reset form...</p>}
        >
          <ResetPasswordForm />
        </Suspense>
        <Link className="auth-secondary-link" href="/sign-in">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
