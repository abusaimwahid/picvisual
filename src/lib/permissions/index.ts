import { redirect } from "next/navigation";
import type { AdminUser } from "@/lib/auth/auth";

export type Permission = "manageUsers" | "manageSettings" | "editContent";
export function hasPermission(user: AdminUser, permission: Permission) { if (user.role === "OWNER") return true; if (user.role === "ADMIN") return permission !== "manageUsers"; return permission === "editContent"; }
export function requirePermission(user: AdminUser, permission: Permission) { if (!hasPermission(user, permission)) redirect("/admin?error=unauthorized"); return user; }
export const canManageUsers = (user: AdminUser) => hasPermission(user, "manageUsers");
export const canManageSettings = (user: AdminUser) => hasPermission(user, "manageSettings");
export const canEditContent = (user: AdminUser) => hasPermission(user, "editContent");
