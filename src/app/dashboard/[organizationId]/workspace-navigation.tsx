"use client";

import {
  ArrowLeftRight,
  BarChart3,
  CircleAlert,
  FileClock,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorkspaceNavigation({
  organizationId,
}: {
  organizationId: string;
}) {
  const pathname = usePathname();
  const navigation = [
    {
      href: `/dashboard/${organizationId}`,
      label: "Overview",
      icon: BarChart3,
      exact: true,
    },
    {
      href: `/dashboard/${organizationId}/imports`,
      label: "Imports",
      icon: FileClock,
    },
    {
      href: `/dashboard/${organizationId}/reconciliation`,
      label: "Reconciliation",
      icon: ArrowLeftRight,
    },
    {
      href: `/dashboard/${organizationId}/exceptions`,
      label: "Exceptions",
      icon: CircleAlert,
    },
    {
      href: `/dashboard/${organizationId}/reports`,
      label: "Reports",
      icon: BarChart3,
    },
    {
      href: `/dashboard/${organizationId}/settings`,
      label: "Settings",
      icon: Settings2,
    },
  ];

  return (
    <nav className="workspace-nav" aria-label="Main navigation">
      {navigation.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={
              active ? "workspace-nav-link is-active" : "workspace-nav-link"
            }
            href={href}
            key={href}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
