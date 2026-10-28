"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="dashboard-sign-out"
      onClick={() => signOut({ redirectTo: "/" })}
      type="button"
    >
      Sign out
    </button>
  );
}
