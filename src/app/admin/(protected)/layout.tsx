import { AdminShell } from "@/components/admin/AdminShell";
import { requireUser } from "@/lib/auth/auth";
import { getPublicBrandSettings } from "@/lib/brand/settings";
export const metadata = { robots: { index: false, follow: false } };
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) { const [user, brand] = await Promise.all([requireUser(), getPublicBrandSettings()]); return <AdminShell user={user} brand={brand}>{children}</AdminShell>; }
