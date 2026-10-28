import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-request-title">
        <Link className="auth-brand" href="/">
          RentFlow <span>Sentinel</span>
        </Link>
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1 id="reset-request-title">Reset your password</h1>
        <p className="auth-intro">
          If an account exists for the address, we&apos;ll email a time-limited
          reset link.
        </p>
        <ForgotPasswordForm />
        <Link className="auth-secondary-link" href="/sign-in">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
