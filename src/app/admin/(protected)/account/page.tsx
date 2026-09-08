import { PasswordForm } from "@/components/admin/PasswordForm";
import { PageHeader } from "@/components/admin/AdminPrimitives";
export default function AccountPage() { return <section className="admin-content"><PageHeader title="Your account" eyebrow="SECURITY" description="Use a unique password for the PicVisual CMS." /><PasswordForm /></section>; }
