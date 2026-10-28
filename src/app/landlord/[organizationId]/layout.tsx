import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RentFlowLogo } from "@/components/rentflow-logo";
import {
  AuthorizationError,
  requireOrganizationAccess,
} from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import { SignOutButton } from "@/app/dashboard/sign-out-button";
import "@/app/dashboard/[organizationId]/workspace.css";
import "@/app/tenant/rental-dashboard.css";

export default async function LandlordLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}>) {
  const { organizationId } = await params;
  let user;
  try {
    user = await requireOrganizationAccess(organizationId, "OPERATOR");
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) {
      redirect("/sign-in");
    }
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  const organization = await getPrisma().organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!organization) notFound();

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Landlord dashboard">
        <Link className="app-brand" href={`/landlord/${organizationId}`}>
          <RentFlowLogo label="PROPERTY PARTNER" />
        </Link>
        <div className="organization-switcher">
          <span className="workspace-label">PROPERTY PORTFOLIO</span>
          <strong>{organization.name}</strong>
          <span>{user.role}</span>
        </div>
        <nav className="workspace-nav" aria-label="Property management">
          <Link href={`/landlord/${organizationId}#listings`}>My rentals</Link>
          <Link href={`/landlord/${organizationId}#enquiries`}>Enquiries</Link>
          <Link href={`/landlord/${organizationId}#new-listing`}>
            Add a rental
          </Link>
          <Link href={`/dashboard/${organizationId}`}>Finance tools</Link>
        </nav>
        <div className="sidebar-bottom">
          <Link className="back-link" href="/dashboard">
            Switch organization
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
