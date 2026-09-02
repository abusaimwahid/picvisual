import { z } from "zod";
export const loginSchema = z.object({ email: z.string().email("Enter a valid work email.").max(255), password: z.string().min(1, "Password is required.").max(1024) });
export const createUserSchema = z.object({ name: z.string().trim().max(100).optional(), email: z.string().trim().email().max(255), password: z.string().min(12, "Use at least 12 characters.").max(1024), role: z.enum(["OWNER", "ADMIN", "EDITOR"]) });
export const updateUserSchema = z.object({ id: z.string().cuid(), role: z.enum(["OWNER", "ADMIN", "EDITOR"]).optional(), isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional() });
