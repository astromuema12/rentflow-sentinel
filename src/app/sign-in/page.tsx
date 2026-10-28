import Link from "next/link";
import { RentFlowLogo } from "@/components/rentflow-logo";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <Link className="auth-brand" href="/">
          <RentFlowLogo label="RENTFLOW" />
        </Link>
        <p className="eyebrow">WELCOME TO RENTFLOW</p>
        <h1 id="sign-in-title">Welcome back</h1>
        <p className="auth-intro">
          Sign in to find a rental, manage property listings, or oversee the
          RentFlow platform.
        </p>
        <SignInForm />
        <Link className="auth-secondary-link" href="/forgot-password">
          Forgot your password?
        </Link>
        <Link className="auth-secondary-link" href="/register">
          New to RentFlow? Create a renter account
        </Link>
      </section>
    </main>
  );
}
