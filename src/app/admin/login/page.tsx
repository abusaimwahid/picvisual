import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getCurrentUser } from "@/lib/auth/auth";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { getPublicBrandSettings } from "@/lib/brand/settings";
export const metadata = { robots: { index: false, follow: false }, title: "Admin login — PicVisual" };
export default async function LoginPage() { if (await getCurrentUser()) redirect("/admin"); const brand = await getPublicBrandSettings(); return <main className="admin-login"><div><BrandLogo className="admin-login-logo" source={brand.mainLogo} priority /><span className="admin-kicker">CONTENT MANAGEMENT SYSTEM</span><h1>Sign in</h1><p>Use an active administrator account to manage content and site settings.</p><LoginForm /><small>Access is logged. Contact the site owner if you need an account.</small></div></main>; }
