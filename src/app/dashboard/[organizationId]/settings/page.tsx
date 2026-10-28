import { MembershipRole } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getOrganizationWorkspace } from "@/lib/workspace";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const access = await getOrganizationWorkspace(organizationId);
  const members =
    access.role === MembershipRole.OWNER || access.role === MembershipRole.ADMIN
      ? await getPrisma().organizationMembership.findMany({
          where: { organizationId },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            role: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
              },
            },
          },
        })
      : [];

  return (
    <div className="workspace-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">ACCESS & PREFERENCES</p>
          <h1>Settings</h1>
          <p className="page-subtitle">
            Your account and organization access details.
          </p>
        </div>
      </header>
      <div className="settings-grid">
        <section className="panel settings-panel">
          <p className="eyebrow">PERSONAL ACCOUNT</p>
          <h2>Signed-in account</h2>
          <dl className="settings-list">
            <div>
              <dt>Email</dt>
              <dd>{access.email}</dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>Active</dd>
            </div>
            <div>
              <dt>Organization role</dt>
              <dd>{access.role}</dd>
            </div>
          </dl>
          <p className="muted-note">
            To update account details or change your password, use the account
            recovery flow or contact your administrator.
          </p>
        </section>
        <section className="panel settings-panel">
          <p className="eyebrow">ORGANIZATION</p>
          <h2>{access.organization.name}</h2>
          <dl className="settings-list">
            <div>
              <dt>Reporting currency</dt>
              <dd>{access.organization.currency}</dd>
            </div>
            <div>
              <dt>Your access</dt>
              <dd>{access.role}</dd>
            </div>
            <div>
              <dt>Permission model</dt>
              <dd>Membership-based</dd>
            </div>
          </dl>
          <p className="muted-note">
            Organization details are read-only here. Contact an owner to request
            changes.
          </p>
        </section>
      </div>
      {members.length ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ORGANIZATION ACCESS</p>
              <h2>Members</h2>
            </div>
            <span className="panel-subtitle">Visible to admins and owners</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Account</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      {[member.user.firstName, member.user.lastName]
                        .filter(Boolean)
                        .join(" ") || "Team member"}
                    </td>
                    <td>{member.user.email}</td>
                    <td>{member.role}</td>
                    <td>{member.user.isActive ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="footnote">
            Membership changes are managed through the authorized membership
            endpoint. No member changes are available in this settings view.
          </p>
        </section>
      ) : null}
    </div>
  );
}
