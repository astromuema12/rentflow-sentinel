import Link from "next/link";
import { RentFlowLogo } from "@/components/rentflow-logo";
import { RenterRegisterForm } from "./renter-register-form";

export default function RenterRegistrationPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <Link className="auth-brand" href="/">
          <RentFlowLogo label="RENTER" />
        </Link>
        <p className="eyebrow">YOUR NEXT HOME STARTS HERE</p>
        <h1 id="register-title">Create a renter account</h1>
        <p className="auth-intro">
          Save homes you like and contact property managers when you are ready.
        </p>
        <RenterRegisterForm />
        <Link className="auth-secondary-link" href="/sign-in">
          Already have an account? Sign in
        </Link>
      </section>
    </main>
  );
}
