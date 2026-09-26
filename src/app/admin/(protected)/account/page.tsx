import { PasswordForm } from "@/components/admin/PasswordForm";
import { PageHeader } from "@/components/admin/AdminPrimitives";
export default function AccountPage() { return <section className="admin-content admin-content-narrow"><PageHeader title="Your account" eyebrow="SECURITY" description="Manage the security settings currently available for your PicVisual CMS account." /><PasswordForm /></section>; }
