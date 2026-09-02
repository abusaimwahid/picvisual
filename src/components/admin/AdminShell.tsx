import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import type { AdminUser } from "@/lib/auth/auth";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { PublicBrandSettings } from "@/lib/brand/settings";

const navigation = [
  ["Dashboard", "/admin"], ["Homepage", "/admin/homepage"], ["Pages", "/admin/pages"], ["Projects", "/admin/projects"], ["Services", "/admin/services"], ["Media", "/admin/media"], ["Testimonials", "/admin/testimonials"], ["Clients", "/admin/clients"], ["FAQ", "/admin/faq"], ["Navigation", "/admin/navigation"], ["Enquiries", "/admin/enquiries"], ["Site settings", "/admin/settings"], ["Brand settings", "/admin/settings/branding"], ["Users", "/admin/users"],
] as const;

export function AdminShell({ user, children, brand }: { user: AdminUser; children: React.ReactNode; brand?: PublicBrandSettings }) {
  return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/admin" className="admin-brand" aria-label="PicVisual CMS"><BrandLogo className="admin-logo-image" source={brand?.mainLogo} /><small>CMS</small></Link><nav aria-label="Admin navigation">{navigation.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav><div className="admin-account"><span>{user.name || user.email}</span><small>{user.role.toLowerCase()}</small><form action={signOut}><button>Sign out ↗</button></form></div></aside><div className="admin-main"><header className="admin-topbar"><Link href="/" target="_blank">View public site ↗</Link><span>{user.email}</span></header>{children}</div></div>;
}
