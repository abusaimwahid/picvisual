import { PageHeader } from "@/components/admin/AdminPrimitives";
import { UserManagement } from "@/components/admin/UserManagement";
import { requireUser } from "@/lib/auth/auth";
import { requirePermission } from "@/lib/permissions";
import { listUsers } from "@/lib/repositories/users";
export default async function UsersPage() { const user = requirePermission(await requireUser(), "manageUsers"); const users = await listUsers(); return <section className="admin-content"><PageHeader eyebrow="SECURITY" title="Users" description="Only owners can create accounts, update roles, and activate or deactivate access." /><UserManagement users={users} actorRole={user.role} /></section>; }
