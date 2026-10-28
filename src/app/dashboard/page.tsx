import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import {
  AuthorizationError,
  requireAuthenticatedUser,
} from "@/lib/auth/authorization";
import { SignOutButton } from "./sign-out-button";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  let sessionUser;
  try {
    sessionUser = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/sign-in");
    }
    throw error;
  }
  const memberships = await getPrisma().organizationMembership.findMany({
    where: { userId: sessionUser.id },
    select: {
      role: true,
      organization: { select: { id: true, name: true, currency: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="organization-picker">
      <header className="organization-picker-header">
        <Link className="app-brand" href="/">
          <span className="app-brand-mark" aria-hidden="true">
            R
          </span>
          <span>
            RentFlow <strong>Sentinel</strong>
          </span>
        </Link>
        <SignOutButton />
      </header>
      <section className="organization-picker-content">
        <p className="eyebrow">YOUR ORGANIZATIONS</p>
        <h1>Select a workspace</h1>
        <p className="page-subtitle">
          Choose an organization you’re authorized to access.
        </p>
        {memberships.length ? (
          <ul className="organization-list">
            {memberships.map(({ organization, role }) => (
              <li key={organization.id}>
                <Link href={`/dashboard/${organization.id}`}>
                  <Building2 size={20} aria-hidden="true" />
                  <span>
                    <strong>{organization.name}</strong>
                    <small>
                      {role} · {organization.currency}
                    </small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <Building2 size={24} aria-hidden="true" />
            <h2>No organization access</h2>
            <p>
              No organizations are assigned to your account. Contact your
              administrator.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
