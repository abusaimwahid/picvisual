import { Suspense } from "react";
import { ActionNotice } from "./ActionNotice";
import type { AdminUser } from "@/lib/auth/auth";
import type { PublicBrandSettings } from "@/lib/brand/settings";
import { AdminWorkspaceShell } from "./AdminWorkspaceShell";

export function AdminShell({ user, children, brand }: { user: AdminUser; children: React.ReactNode; brand?: PublicBrandSettings }) {
  return <AdminWorkspaceShell user={user} brand={brand}><Suspense><ActionNotice /></Suspense>{children}</AdminWorkspaceShell>;
}
