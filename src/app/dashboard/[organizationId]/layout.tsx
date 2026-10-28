import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthorizationError } from "@/lib/auth/authorization";
import { getOrganizationWorkspace } from "@/lib/workspace";
import { SignOutButton } from "../sign-out-button";
import { WorkspaceNavigation } from "./workspace-navigation";

export default async function OrganizationLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ organizationId: string }>;
}>) {
  const { organizationId } = await params;
  let workspace;
  try {
    workspace = await getOrganizationWorkspace(organizationId);
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) {
      redirect("/sign-in");
    }
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
  const { organization, role } = workspace;

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Organization workspace">
        <Link className="app-brand" href="/dashboard">
          <span className="app-brand-mark" aria-hidden="true">
            R
          </span>
          <span className="app-brand-copy">
            <span>
              RentFlow <strong>Sentinel</strong>
            </span>
            <small>PROPERTY FINANCE</small>
          </span>
        </Link>
        <div className="organization-switcher">
          <span className="workspace-label">WORKSPACE</span>
          <strong>{organization.name}</strong>
          <span>
            {organization.currency} · {role}
          </span>
        </div>
        <WorkspaceNavigation organizationId={organizationId} />
        <div className="sidebar-bottom">
          <Link className="back-link" href="/dashboard">
            All organizations
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
