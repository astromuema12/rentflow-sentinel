import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <Link className="auth-brand" href="/">
          RentFlow <span>Sentinel</span>
        </Link>
        <p className="eyebrow">SECURE WORKSPACE</p>
        <h1 id="sign-in-title">Welcome back</h1>
        <p className="auth-intro">
          Sign in with the account provided by your organization administrator.
        </p>
        <SignInForm />
        <Link className="auth-secondary-link" href="/forgot-password">
          Forgot your password?
        </Link>
      </section>
    </main>
  );
}
