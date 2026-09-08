"use server";

import bcrypt from "bcryptjs";
import { ensureProjectBaseline, ensureServiceBaseline, snapshotJson } from "@/cms/catalog-publication";
import { cookies, headers } from "next/headers";
import { navigationInput, settingInput, contactInput, httpsUrlSchema } from "@/lib/validation/site";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { audit } from "@/lib/audit/log";
import { requireUser } from "@/lib/auth/auth";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/permissions";
import { createUserSchema, loginSchema, updateUserSchema } from "@/lib/validation/admin";
import { brandSettingKeys } from "@/lib/brand/settings";
import { getBrandAssetConfig, brandAssetKindSchema, type BrandAssetKind, validateBrandAsset } from "@/lib/media/brand-validation";
import { getMediaProvider } from "@/lib/media/provider";
import { normalizeFocalPoint } from "@/lib/media/validation";
import { createMediaFromFile } from "@/lib/media/upload";
import { getMediaUsage } from "@/lib/media/usage";
import { validateSection } from "@/cms/types/sections";
import type { SectionType } from "@/cms/types/sections";
import { hasAllowedMediaKinds, protectedHomepageSectionTypes, sectionMediaRequirements } from "@/cms/homepage-editor";
import { getHomepageMoveTarget } from "@/cms/homepage-ordering";
import { ensureHomepagePublishedBaseline, saveHomepageDraftSnapshot } from "@/cms/homepage-publication";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export type LoginState = { error?: string };
export type BrandActionState = { error?: string; success?: string };

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return { error: "Sign-in is temporarily unavailable. Please contact the site owner." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const identity = parsed.data.email.toLowerCase();
  const address = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  try { if (!await consumeRateLimit("login-email", identity, 10, 15 * 60_000) || !await consumeRateLimit("login-ip", address, 50, 15 * 60_000)) return { error: "Too many attempts. Please try again in 15 minutes." }; } catch { return { error: "Sign-in is temporarily unavailable. Please try again." }; }
  const user = await prisma.user.findUnique({ where: { email: identity } });
  if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return { error: "Invalid email or password." };
  const token = await createSessionToken({ userId: user.id, role: user.role });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "AUTH_LOGIN", "User", user.id);
  redirect("/admin");
}

export async function signOut() { const jar = await cookies(); jar.delete(SESSION_COOKIE); redirect("/admin/login"); }

export async function createUser(formData: FormData) {
  const actor = requirePermission(await requireUser(), "manageUsers");
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?error=invalid-user");
  if (parsed.data.role === "OWNER" && actor.role !== "OWNER") redirect("/admin/users?error=unauthorized");
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) redirect("/admin/users?error=email-exists");
  const user = await prisma.user.create({ data: { name: parsed.data.name || null, email: parsed.data.email.toLowerCase(), passwordHash: await bcrypt.hash(parsed.data.password, 12), role: parsed.data.role } });
  await audit(actor.id, "USER_CREATED", "User", user.id, { role: user.role });
  redirect("/admin/users?success=created");
}

export async function updateUser(formData: FormData) {
  const actor = requirePermission(await requireUser(), "manageUsers");
  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?error=invalid-update");
  const target = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!target) redirect("/admin/users?error=not-found");
  const nextRole = parsed.data.role ?? target.role; const nextActive = parsed.data.isActive ?? target.isActive;
  if (actor.id === target.id && !nextActive) redirect("/admin/users?error=self-lockout");
  const result = await prisma.$transaction(async (tx) => {
    // Serialize role changes so simultaneous requests cannot remove the last owner.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(724901)`;
    const fresh = await tx.user.findUniqueOrThrow({ where: { id: target.id } });
    if (fresh.role === "OWNER" && (nextRole !== "OWNER" || !nextActive)) {
      const owners = await tx.user.count({ where: { role: "OWNER", isActive: true } });
      if (owners <= 1) return false;
    }
    await tx.user.update({ where: { id: target.id }, data: { role: nextRole, isActive: nextActive } });
    return true;
  });
  if (!result) redirect("/admin/users?error=last-owner");
  await audit(actor.id, "USER_UPDATED", "User", target.id, { role: nextRole, isActive: nextActive });
  redirect("/admin/users?success=updated");
}

function assetLabel(kind: BrandAssetKind) { return ({ mainLogo: "Main logo", compactLogo: "Compact logo", favicon: "Favicon", socialLogo: "Social logo" })[kind]; }

export async function uploadBrandAsset(_previous: BrandActionState, formData: FormData): Promise<BrandActionState> {
  const actor = requirePermission(await requireUser(), "manageSettings");
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const kindResult = brandAssetKindSchema.safeParse(formData.get("kind"));
  if (!kindResult.success) return { error: "Unknown brand asset type." };
  const kind = kindResult.data; const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  try {
    const bytes = new Uint8Array(await file.arrayBuffer()); const validated = validateBrandAsset(kind, { name: file.name, type: file.type, size: file.size, bytes });
    const stored = await getMediaProvider().upload({ filename: file.name, mimeType: validated.mimeType, fileSize: file.size, bytes, mediaType: "IMAGE" });
    const media = await prisma.media.create({ data: { filename: file.name, originalFilename: file.name, storageProvider: "cloudinary", storageKey: stored.storageKey, publicUrl: stored.publicUrl, mimeType: validated.mimeType, mediaType: "IMAGE", fileSize: file.size } });
    await prisma.siteSetting.upsert({ where: { key: brandSettingKeys[kind] }, update: { logoMediaId: media.id, value: { assetType: kind } }, create: { key: brandSettingKeys[kind], logoMediaId: media.id, value: { assetType: kind } } });
    await audit(actor.id, "BRAND_ASSET_REPLACED", "SiteSetting", brandSettingKeys[kind], { asset: kind, mediaId: media.id });
    revalidateTag("brand-settings");
    return { success: `${assetLabel(kind)} updated.` };
  } catch (error) { return { error: error instanceof Error ? error.message : "The asset could not be uploaded." }; }
}

export async function selectBrandAsset(_previous: BrandActionState, formData: FormData): Promise<BrandActionState> {
  const actor = requirePermission(await requireUser(), "manageSettings");
  const kind = brandAssetKindSchema.safeParse(formData.get("kind"));
  const id = z.string().cuid().safeParse(formData.get("mediaId"));
  if (!kind.success || !id.success) return { error: "Choose a brand asset from the library." };
  const media = await prisma.media.findUnique({ where: { id: id.data } });
  if (!media || media.mediaType !== "IMAGE") return { error: "Choose an image asset." };
  const config = getBrandAssetConfig(kind.data);
  if (!config.types.includes(media.mimeType as never) || !media.fileSize || media.fileSize > config.maxSize) return { error: "This image does not meet the brand format or size requirements shown below." };
  await prisma.siteSetting.upsert({ where: { key: brandSettingKeys[kind.data] }, update: { logoMediaId: media.id, value: { assetType: kind.data } }, create: { key: brandSettingKeys[kind.data], logoMediaId: media.id, value: { assetType: kind.data } } });
  await audit(actor.id, "BRAND_ASSET_REPLACED", "SiteSetting", brandSettingKeys[kind.data], { mediaId: media.id });
  revalidateTag("brand-settings"); revalidatePath("/", "layout");
  return { success: `${assetLabel(kind.data)} updated.` };
}

export async function resetBrandAsset(_previous: BrandActionState, formData: FormData): Promise<BrandActionState> {
  const actor = requirePermission(await requireUser(), "manageSettings");
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const kindResult = brandAssetKindSchema.safeParse(formData.get("kind"));
  if (!kindResult.success) return { error: "Unknown brand asset type." };
  const kind = kindResult.data;
  try {
    await prisma.siteSetting.delete({ where: { key: brandSettingKeys[kind] } }).catch(() => undefined);
    await audit(actor.id, "BRAND_ASSET_RESET", "SiteSetting", brandSettingKeys[kind], { asset: kind });
    revalidateTag("brand-settings");
    return { success: `${assetLabel(kind)} reset to the official default.` };
  } catch { return { error: "The asset could not be reset." }; }
}

const safeSlug = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens.");
const optionalMediaId = z.string().cuid().optional().or(z.literal("")).default(""); const optionalInteger = z.preprocess((value) => value === "" || value === undefined ? undefined : value, z.coerce.number().int().min(0).max(9999).optional());
const projectInput = z.object({ id: z.string().cuid().optional(), title: z.string().trim().min(2).max(160), slug: safeSlug, category: z.string().trim().min(2).max(80), summary: z.string().trim().min(10).max(600), description: z.string().trim().max(8000).optional().default(""), services: z.string().max(500).optional().default(""), year: z.preprocess((value) => value === "" || value === undefined ? undefined : value, z.coerce.number().int().min(1900).max(2100).optional()), clientName: z.string().trim().max(160).optional().default(""), featuredOrder: optionalInteger, heroMediaId: optionalMediaId, thumbnailMediaId: optionalMediaId, beforeMediaId: optionalMediaId, afterMediaId: optionalMediaId, videoMediaId: optionalMediaId, videoPosterMediaId: optionalMediaId, ogImageId: optionalMediaId, seoTitle: z.string().trim().max(160).optional().default(""), seoDescription: z.string().trim().max(320).optional().default(""), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]), featured: z.enum(["true", "false"]).transform((value) => value === "true") });
const serviceInput = z.object({ id: z.string().cuid().optional(), title: z.string().trim().min(2).max(160), slug: safeSlug, category: z.string().trim().min(2).max(80), shortDescription: z.string().trim().min(10).max(600), description: z.string().trim().max(5000).optional().default(""), featured: z.enum(["true", "false"]).transform((value) => value === "true"), featuredOrder: optionalInteger, heroMediaId: optionalMediaId, thumbnailMediaId: optionalMediaId, ogImageId: optionalMediaId, seoTitle: z.string().trim().max(160).optional().default(""), seoDescription: z.string().trim().max(320).optional().default(""), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) });
const faqInput = z.object({ id: z.string().cuid().optional(), question: z.string().trim().min(5).max(400), answer: z.string().trim().min(5).max(3000), enabled: z.enum(["true", "false"]).transform((value) => value === "true") });

async function invalidate(...tags: string[]) { tags.forEach((tag) => revalidateTag(tag)); }
async function prepareHomepageDraft(pageId: string, actorId: string) { await prisma.$transaction((tx) => ensureHomepagePublishedBaseline(tx, pageId, actorId)); }
async function recordHomepageDraft(pageId: string, actorId: string) { await prisma.$transaction((tx) => saveHomepageDraftSnapshot(tx, pageId, actorId)); }
async function validateMediaReferences(references: Array<{ id: string; type: "IMAGE" | "VIDEO" }>) { const expected = references.filter((reference) => reference.id); if (!expected.length) return true; const media = await prisma.media.findMany({ where: { id: { in: [...new Set(expected.map((reference) => reference.id))] } }, select: { id: true, mediaType: true } }); const byId = new Map(media.map((item) => [item.id, item.mediaType])); return expected.every((reference) => byId.get(reference.id) === reference.type); }

export async function saveProject(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = projectInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/projects?error=invalid-project"); const data = parsed.data; if (!await validateMediaReferences([{ id: data.heroMediaId, type: "IMAGE" }, { id: data.thumbnailMediaId, type: "IMAGE" }, { id: data.beforeMediaId, type: "IMAGE" }, { id: data.afterMediaId, type: "IMAGE" }, { id: data.videoMediaId, type: "VIDEO" }, { id: data.videoPosterMediaId, type: "IMAGE" }, { id: data.ogImageId, type: "IMAGE" }])) redirect("/admin/projects?error=invalid-media");
  const intent = z.enum(["draft", "publish", "archive"]).catch("draft").parse(formData.get("intent"));
  const current = data.id ? await prisma.project.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !current) redirect("/admin/projects?error=not-found");
  const conflict = await prisma.project.findFirst({ where: { OR: [{ slug: data.slug }, { publishedSlug: data.slug }], ...(data.id ? { id: { not: data.id } } : {}) } });
  if (conflict) redirect("/admin/projects?error=slug-taken");
  if (intent === "publish" && current?.publishedSlug && current.publishedSlug !== data.slug && formData.get("confirmSlugChange") !== "true") redirect(`/admin/projects/${current.id}?error=confirm-slug-change`);
  const record = await prisma.$transaction(async (tx) => {
    if (current) await ensureProjectBaseline(tx, current.id);
    const values = { ...{ title: data.title, slug: data.slug, category: data.category, summary: data.summary, description: data.description || null, services: data.services.split(",").map((item) => item.trim()).filter(Boolean), year: data.year || null, clientName: data.clientName || null, featured: data.featured, featuredOrder: data.featured ? data.featuredOrder ?? 0 : null, heroMediaId: data.heroMediaId || null, thumbnailMediaId: data.thumbnailMediaId || null, beforeMediaId: data.beforeMediaId || null, afterMediaId: data.afterMediaId || null, videoMediaId: data.videoMediaId || null, videoPosterMediaId: data.videoPosterMediaId || null, ogImageId: data.ogImageId || null, seoTitle: data.seoTitle || null, seoDescription: data.seoDescription || null, status: "DRAFT" as const }, status: intent === "archive" ? "ARCHIVED" as const : intent === "publish" ? "PUBLISHED" as const : current?.status ?? "DRAFT" as const };
    const saved = data.id ? await tx.project.update({ where: { id: data.id }, data: values }) : await tx.project.create({ data: values });
    if (intent === "publish") {
      const complete = await tx.project.findUniqueOrThrow({ where: { id: saved.id } , include: { media: { orderBy: { order: "asc" } } } });
      await tx.project.update({ where: { id: saved.id }, data: { publishedSnapshot: snapshotJson(complete) , publishedSlug: complete.slug, publishedAt: new Date() } });
    }
    await tx.auditLog.create({ data: { userId: actor.id, action: intent === "publish" ? "PUBLISH" : intent === "archive" ? "ARCHIVE" : "DRAFT_SAVE", entityType: "Project", entityId: saved.id } });
    return saved;
  });
  if (intent !== "draft") await invalidate("public-projects", "public-home");
  redirect(`/admin/projects/${record.id}?success=${intent === "draft" ? "draft-saved" : intent === "publish" ? "published" : "archived"}`);
}

export async function saveService(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = serviceInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/services?error=invalid-service"); const data = parsed.data; if (!await validateMediaReferences([{ id: data.heroMediaId, type: "IMAGE" }, { id: data.thumbnailMediaId, type: "IMAGE" }, { id: data.ogImageId, type: "IMAGE" }])) redirect("/admin/services?error=invalid-media");
  const intent = z.enum(["draft", "publish", "archive"]).catch("draft").parse(formData.get("intent"));
  const current = data.id ? await prisma.service.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !current) redirect("/admin/services?error=not-found");
  const conflict = await prisma.service.findFirst({ where: { OR: [{ slug: data.slug }], ...(data.id ? { id: { not: data.id } } : {}) } });
  if (conflict) redirect("/admin/services?error=slug-taken");

  const record = await prisma.$transaction(async (tx) => {
    if (current) await ensureServiceBaseline(tx, current.id);
    const values = { ...{ title: data.title, slug: data.slug, category: data.category, shortDescription: data.shortDescription, description: data.description || null, featured: data.featured, featuredOrder: data.featured ? data.featuredOrder ?? 0 : null, heroMediaId: data.heroMediaId || null, thumbnailMediaId: data.thumbnailMediaId || null, ogImageId: data.ogImageId || null, seoTitle: data.seoTitle || null, seoDescription: data.seoDescription || null, status: "DRAFT" as const }, status: intent === "archive" ? "ARCHIVED" as const : intent === "publish" ? "PUBLISHED" as const : current?.status ?? "DRAFT" as const };
    const saved = data.id ? await tx.service.update({ where: { id: data.id }, data: values }) : await tx.service.create({ data: values });
    if (intent === "publish") {
      const complete = await tx.service.findUniqueOrThrow({ where: { id: saved.id }  });
      await tx.service.update({ where: { id: saved.id }, data: { publishedSnapshot: snapshotJson(complete)  } });
    }
    await tx.auditLog.create({ data: { userId: actor.id, action: intent === "publish" ? "PUBLISH" : intent === "archive" ? "ARCHIVE" : "DRAFT_SAVE", entityType: "Service", entityId: saved.id } });
    return saved;
  });
  if (intent !== "draft") await invalidate("public-services", "public-home");
  redirect(`/admin/services?success=${intent === "draft" ? "draft-saved" : intent === "publish" ? "published" : "archived"}&id=${record.id}`);
}

export async function saveFaq(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = faqInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/faq?error=invalid-faq"); const data = parsed.data; const faq = data.id ? await prisma.fAQ.update({ where: { id: data.id }, data: { question: data.question, answer: data.answer, enabled: data.enabled } }) : await prisma.fAQ.create({ data: { question: data.question, answer: data.answer, enabled: data.enabled, pageKey: "home", order: ((await prisma.fAQ.aggregate({ where: { pageKey: "home" }, _max: { order: true } }))._max.order ?? -1) + 1 } }); await audit(actor.id, data.id ? "FAQ_UPDATED" : "FAQ_CREATED", "FAQ", faq.id); await invalidate("public-faq", "public-home"); redirect("/admin/faq?success=saved"); }

export async function updateEnquiryStatus(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); const status = z.enum(["NEW", "IN_PROGRESS", "REPLIED", "CLOSED"]).safeParse(formData.get("status")); if (!id.success || !status.success) redirect("/admin/enquiries?error=invalid-enquiry"); await prisma.contactSubmission.update({ where: { id: id.data }, data: { status: status.data } }); await audit(actor.id, "ENQUIRY_STATUS_UPDATED", "ContactSubmission", id.data, { status: status.data }); redirect("/admin/enquiries?success=saved"); }

const pageInput = z.object({ id: z.string().cuid(), title: z.string().trim().min(2).max(160), status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]), seoTitle: z.string().trim().max(160), seoDescription: z.string().trim().max(320), body: z.string().trim().max(4000), approachHeading: z.string().trim().max(160).optional().default(""), approachBody: z.string().trim().max(4000).optional().default("") });
export async function savePage(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const parsed = pageInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/pages?error=invalid-page"); const data = parsed.data;
  const target = await prisma.page.findUnique({ where: { id: data.id } }); if (!target || target.slug === "home") redirect("/admin/homepage");
  const page = await prisma.page.update({ where: { id: data.id }, data: { title: data.title, status: data.status, seoTitle: data.seoTitle || null, seoDescription: data.seoDescription || null, publishedAt: data.status === "PUBLISHED" ? new Date() : null } });
  const existing = await prisma.pageSection.findFirst({ where: { pageId: page.id, type: "richText" }, orderBy: { order: "asc" } });
  await prisma.pageSection.upsert({ where: { pageId_order: { pageId: page.id, order: existing?.order ?? 0 } }, update: { type: "richText", content: { body: data.body, approachHeading: data.approachHeading, approachBody: data.approachBody }, enabled: true }, create: { pageId: page.id, type: "richText", order: 0, content: { body: data.body, approachHeading: data.approachHeading, approachBody: data.approachBody } } });
  await prisma.pageRevision.create({ data: { pageId: page.id, authorId: actor.id, snapshot: { title: data.title, status: data.status, seoTitle: data.seoTitle, seoDescription: data.seoDescription, body: data.body }, note: "Page editor save" } });
  await audit(actor.id, "PAGE_UPDATED", "Page", page.id, { slug: page.slug, status: page.status }); await invalidate("public-pages", page.slug === "home" ? "public-home" : page.slug === "about" ? "public-studio" : "public-contact"); redirect("/admin/pages?success=saved");
}

export async function saveNavigationItem(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const parsed = navigationInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/navigation?error=invalid-navigation"); const data = parsed.data;
  const navigation = await prisma.navigation.upsert({ where: { kind: data.kind }, update: {}, create: { name: data.kind === "HEADER" ? "Header" : "Footer", kind: data.kind } });
  const item = data.id ? await prisma.navigationItem.update({ where: { id: data.id }, data: { label: data.label, href: data.href, enabled: data.enabled, openInNewTab: data.openInNewTab } }) : await prisma.navigationItem.create({ data: { navigationId: navigation.id, label: data.label, href: data.href, enabled: data.enabled, openInNewTab: data.openInNewTab, order: await prisma.navigationItem.count({ where: { navigationId: navigation.id } }) } });
  await audit(actor.id, data.id ? "NAVIGATION_UPDATED" : "NAVIGATION_CREATED", "NavigationItem", item.id); await invalidate("public-navigation"); redirect("/admin/navigation?success=saved");
}

export async function saveSiteSettings(formData: FormData) {
  const actor = requirePermission(await requireUser(), "manageSettings"); const parsed = settingInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/settings?error=invalid-settings");
  if (parsed.data.ogImageId && !await validateMediaReferences([{ id: parsed.data.ogImageId, type: "IMAGE" }])) redirect("/admin/settings?error=invalid-media");
  await prisma.siteSetting.upsert({ where: { key: "global" }, update: { value: parsed.data }, create: { key: "global", value: parsed.data } }); await audit(actor.id, "SITE_SETTINGS_UPDATED", "SiteSetting", "global"); await invalidate("public-settings"); redirect("/admin/settings?success=saved");
}

export async function uploadMedia(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const file = formData.get("file"); if (!(file instanceof File) || file.size === 0) redirect("/admin/media?error=missing-file");
  try { const media = await createMediaFromFile({ name: file.name, type: file.type, size: file.size, bytes: new Uint8Array(await file.arrayBuffer()) }); await audit(actor.id, "MEDIA_UPLOADED", "Media", media.id); } catch (error) { const text = error instanceof Error ? error.message : ""; const message = /not configured/i.test(text) ? "storage-not-configured" : /unsupported|signature|SVG|empty|limit/i.test(text) ? "invalid-file" : "storage-unavailable"; redirect(`/admin/media?error=${message}`); }
  redirect("/admin/media?success=uploaded");
}
const mediaUpdateInput = z.object({ id: z.string().cuid(), alt: z.string().trim().max(500).optional().default(""), caption: z.string().trim().max(1000).optional().default(""), focalX: z.coerce.number().optional(), focalY: z.coerce.number().optional() });
export async function saveMediaMetadata(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = mediaUpdateInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/media?error=invalid-metadata"); const existing = await prisma.media.findUnique({ where: { id: parsed.data.id } }); if (!existing) redirect("/admin/media?error=not-found"); const focalX = existing.mediaType === "IMAGE" && parsed.data.focalX !== undefined ? normalizeFocalPoint(parsed.data.focalX) : existing.focalX; const focalY = existing.mediaType === "IMAGE" && parsed.data.focalY !== undefined ? normalizeFocalPoint(parsed.data.focalY) : existing.focalY; await prisma.media.update({ where: { id: existing.id }, data: { alt: parsed.data.alt || null, caption: parsed.data.caption || null, focalX, focalY } }); await audit(actor.id, focalX !== existing.focalX || focalY !== existing.focalY ? "MEDIA_FOCAL_UPDATED" : "MEDIA_METADATA_UPDATED", "Media", existing.id); await invalidate("public-home", "public-projects", "public-services", "brand-settings"); redirect("/admin/media?success=metadata-saved"); }

export async function submitContactEnquiry(formData: FormData): Promise<{ error?: string; success?: string; mailto?: string }> {
  if (String(formData.get("website") ?? "")) return { success: "Thanks — your enquiry has been received." };
  const parsed = contactInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const data = parsed.data;
  if (Date.now() - data.startedAt < 1500 || Date.now() - data.startedAt > 86_400_000) return { error: "Please take a moment to review your enquiry, then try again." };
  if (!hasDatabaseUrl()) return { error: "Online enquiries are temporarily unavailable. Please email info@picvisual.com." };
  try {
    const previous = await prisma.contactSubmission.findUnique({ where: { requestId: data.requestId } });
    if (previous) return { success: "Thanks — your enquiry has been received." };
    const address = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!await consumeRateLimit("contact", address, 8, 60 * 60_000)) return { error: "Please try again later, or email info@picvisual.com." };
    await prisma.contactSubmission.upsert({ where: { requestId: data.requestId }, update: {}, create: { name: data.name, email: data.email, company: data.company || null, projectType: data.projectType || null, estimatedVolume: data.estimatedVolume || null, timeline: data.timeline || null, message: data.message, projectLink: data.projectLink || null, requestId: data.requestId } });
    return { success: "Thanks — your enquiry has been received." };
  } catch { return { error: "We could not save your enquiry. Please try again, or email info@picvisual.com." }; }
}

const editorSectionType = z.enum(["hero", "positioning", "capabilities", "beforeAfter", "selectedWork", "motionShowcase", "productionWorkflow", "whyPicVisual", "faq", "cta", "textMedia", "gallery", "video", "richText", "imagePost", "videoEdit", "motion", "product", "jewelry", "creative", "development"]);
export async function saveHomepageBuilderSection(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent");
  const id = z.string().cuid().safeParse(formData.get("id")); const type = editorSectionType.safeParse(formData.get("type"));
  if (!id.success || !type.success) redirect("/admin/homepage?error=invalid-section");
  const rawContent = String(formData.get("content") ?? "{}"); let parsedContent: unknown;
  try { parsedContent = JSON.parse(rawContent); } catch { redirect("/admin/homepage?error=invalid-content"); }
  let content: unknown;
  try { content = validateSection(type.data, parsedContent); } catch { redirect("/admin/homepage?error=invalid-content"); }
  const requirements = sectionMediaRequirements(type.data as SectionType, content as Record<string, unknown>);
  if (requirements.length) {
    const media = await prisma.media.findMany({ where: { id: { in: [...new Set(requirements.map((entry) => entry.id))] } }, select: { id: true, mediaType: true } });
    if (!hasAllowedMediaKinds(requirements, media)) redirect("/admin/homepage?error=invalid-media");
  }
  const section = await prisma.pageSection.findUnique({ where: { id: id.data } });
  if (!section || section.type !== type.data || section.pageId !== (await prisma.page.findUnique({ where: { slug: "home" }, select: { id: true } }))?.id) redirect("/admin/homepage?error=invalid-section");
  await prepareHomepageDraft(section.pageId, actor.id);
  const jsonContent = content as Prisma.InputJsonValue;
  await prisma.pageSection.update({ where: { id: id.data }, data: { content: jsonContent, enabled: formData.getAll("enabled").includes("true") } });
  await recordHomepageDraft(section.pageId, actor.id);
  await audit(actor.id, "DRAFT_SAVE", "Page", section.pageId, { section: type.data }); redirect("/admin/homepage?success=draft-saved");
}

const homeSectionType = z.enum(["hero", "positioning", "capabilities", "beforeAfter", "selectedWork", "motionShowcase", "productionWorkflow", "whyPicVisual", "faq", "cta", "textMedia", "gallery", "video", "richText", "imagePost", "videoEdit", "motion", "product", "jewelry", "creative", "development"]);
const homeSectionAction = z.object({ id: z.string().cuid(), direction: z.enum(["up", "down"]).optional() });
const sectionDefaults: Record<z.infer<typeof homeSectionType>, Prisma.InputJsonValue> = { hero: { eyebrow: "", headline: "New hero", description: "", primaryCta: { label: "Explore", href: "/work" } }, positioning: { headline: "New statement", body: "" }, capabilities: { serviceIds: [] }, beforeAfter: { heading: "Raw / refined" }, selectedWork: { heading: "Selected Work", projectIds: [] }, motionShowcase: { heading: "Motion" }, productionWorkflow: { heading: "Workflow", steps: [{ title: "Send", description: "" }, { title: "Finish", description: "" }] }, whyPicVisual: { heading: "Why PicVisual", items: [] }, faq: { heading: "FAQ", faqIds: [] }, cta: { eyebrow: "Start", heading: "New CTA", body: "", cta: { label: "Contact", href: "/contact" } }, textMedia: { heading: "New section", body: "", preset: "editorial" }, gallery: { mediaIds: [], preset: "editorial-collage" }, video: { mediaId: "" }, richText: { body: "" }, imagePost: { label: "IMAGE POST", heading: "New image post", description: "", detailMediaIds: [] }, videoEdit: { label: "VIDEO EDIT", heading: "New video edit", description: "", timelineMediaIds: [] }, motion: { label: "MOTION", heading: "New motion scene", description: "" }, product: { label: "PRODUCT", heading: "New product scene", description: "" }, jewelry: { label: "JEWELRY", heading: "New jewelry scene", description: "" }, creative: { label: "CREATIVE", heading: "New creative scene", description: "" }, development: { label: "INTERACTIVE", heading: "New interactive scene", description: "" } };
export async function addHomeSection(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const type = homeSectionType.safeParse(formData.get("type")); if (!type.success) redirect("/admin/homepage?error=invalid-section-type");
  const page = await prisma.page.findUnique({ where: { slug: "home" }, include: { sections: { orderBy: { order: "asc" } } } }); if (!page) redirect("/admin/homepage?error=missing-home");
  const repeatable = ["textMedia", "richText", "gallery", "video", "productionWorkflow", "whyPicVisual", "faq"];
  if (!repeatable.includes(type.data) && page.sections.some((section) => section.type === type.data)) redirect("/admin/homepage?error=section-already-exists");
  await prisma.$transaction(async (tx) => {
    await ensureHomepagePublishedBaseline(tx, page.id, actor.id);
    const cta = page.sections.find((section) => section.type === "cta"); const order = cta?.order ?? page.sections.length;
    if (cta) await tx.pageSection.update({ where: { id: cta.id }, data: { order: order + 1 } });
    await tx.pageSection.create({ data: { pageId: page.id, type: type.data, order, enabled: false, content: sectionDefaults[type.data] } });
    await saveHomepageDraftSnapshot(tx, page.id, actor.id);
  });
  await audit(actor.id, "DRAFT_SAVE", "Page", page.id, { section: type.data }); redirect("/admin/homepage?success=draft-saved");
}
export async function duplicateHomeSection(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = homeSectionAction.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/homepage?error=invalid-section"); const source = await prisma.pageSection.findUnique({ where: { id: parsed.data.id } }); if (!source) redirect("/admin/homepage?error=not-found"); await prepareHomepageDraft(source.pageId, actor.id); await prisma.$transaction(async (tx) => { const following = await tx.pageSection.findMany({ where: { pageId: source.pageId, order: { gt: source.order } }, orderBy: { order: "desc" }, select: { id: true, order: true } }); await tx.pageSection.update({ where: { id: source.id }, data: { order: -1 } }); for (const section of following) await tx.pageSection.update({ where: { id: section.id }, data: { order: section.order + 1 } }); await tx.pageSection.update({ where: { id: source.id }, data: { order: source.order } }); await tx.pageSection.create({ data: { pageId: source.pageId, type: source.type, order: source.order + 1, enabled: false, theme: source.theme, content: source.content as Prisma.InputJsonValue, settings: source.settings === null ? Prisma.JsonNull : source.settings as Prisma.InputJsonValue } }); }); await recordHomepageDraft(source.pageId, actor.id); await audit(actor.id, "DRAFT_SAVE", "Page", source.pageId, { section: source.type }); redirect("/admin/homepage?success=draft-saved"); }
export async function deleteHomeSection(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = homeSectionAction.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/homepage?error=invalid-section"); const section = await prisma.pageSection.findUnique({ where: { id: parsed.data.id } }); if (!section || protectedHomepageSectionTypes.has(section.type)) redirect("/admin/homepage?error=protected-section"); await prepareHomepageDraft(section.pageId, actor.id); await prisma.$transaction(async (tx) => { await tx.pageSection.delete({ where: { id: section.id } }); await tx.pageSection.updateMany({ where: { pageId: section.pageId, order: { gt: section.order } }, data: { order: { decrement: 1 } } }); }); await recordHomepageDraft(section.pageId, actor.id); await audit(actor.id, "DRAFT_SAVE", "Page", section.pageId, { section: section.type }); redirect("/admin/homepage?success=draft-saved"); }
async function normalizeHomeSectionOrders(tx: Prisma.TransactionClient, pageId: string) { const sections = await tx.pageSection.findMany({ where: { pageId }, orderBy: { order: "asc" }, select: { id: true, order: true } }); if (sections.every((section, index) => section.order === index)) return; for (const [index, section] of sections.entries()) await tx.pageSection.update({ where: { id: section.id }, data: { order: -10_000 - index } }); for (const [index, section] of sections.entries()) await tx.pageSection.update({ where: { id: section.id }, data: { order: index } }); }
export async function moveHomeSection(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = homeSectionAction.safeParse(Object.fromEntries(formData)); if (!parsed.success || !parsed.data.direction) redirect("/admin/homepage?error=invalid-order"); const current = await prisma.pageSection.findUnique({ where: { id: parsed.data.id } }); if (!current) redirect("/admin/homepage?error=not-found"); const sections = await prisma.pageSection.findMany({ where: { pageId: current.pageId }, select: { id: true, type: true, order: true }, orderBy: { order: "asc" } }); const sibling = getHomepageMoveTarget(sections, current.id, parsed.data.direction); if (!sibling) redirect("/admin/homepage?error=order-constraint"); await prepareHomepageDraft(current.pageId, actor.id); await prisma.$transaction(async (tx) => { await tx.pageSection.update({ where: { id: current.id }, data: { order: -1 } }); await tx.pageSection.update({ where: { id: sibling.id }, data: { order: current.order } }); await tx.pageSection.update({ where: { id: current.id }, data: { order: sibling.order } }); await normalizeHomeSectionOrders(tx, current.pageId); }); await recordHomepageDraft(current.pageId, actor.id); await audit(actor.id, "DRAFT_SAVE", "Page", current.pageId, { direction: parsed.data.direction }); redirect("/admin/homepage?success=draft-saved"); }

export async function publishHomepage() {
  const actor = requirePermission(await requireUser(), "editContent");
  const page = await prisma.page.findUnique({ where: { slug: "home" }, include: { sections: { orderBy: { order: "asc" } } } });
  if (!page) redirect("/admin/homepage?error=missing-home");
  await prepareHomepageDraft(page.id, actor.id);
  const snapshot = (await import("@/cms/homepage-publication")).makeHomepageSnapshot(page);
  const problem = await (await import("@/cms/homepage-publication")).validateHomepageSnapshot(prisma, snapshot);
  if (problem) redirect(`/admin/homepage?error=${encodeURIComponent(problem)}`);
  await prisma.$transaction(async (tx) => {
    await tx.pageRevision.create({ data: { pageId: page.id, authorId: actor.id, snapshot: snapshot as Prisma.InputJsonValue, note: "homepage:published" } });
    await tx.page.update({ where: { id: page.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  });
  await audit(actor.id, "PUBLISH", "Page", page.id, { slug: "home" });
  await invalidate("public-home", "public-pages");
  redirect("/admin/homepage?success=published");
}

export async function restoreHomepageRevision(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent");
  const revisionId = z.string().cuid().safeParse(formData.get("revisionId"));
  if (!revisionId.success) redirect("/admin/homepage?error=invalid-revision");
  const revision = await prisma.pageRevision.findUnique({ where: { id: revisionId.data }, include: { page: { select: { slug: true } } } });
  const publication = await import("@/cms/homepage-publication"); const snapshot = publication.readHomepageSnapshot(revision?.snapshot);
  if (!revision || revision.page.slug !== "home" || !snapshot) redirect("/admin/homepage?error=invalid-revision");
  const problem = await publication.validateHomepageSnapshot(prisma, snapshot);
  if (problem) redirect(`/admin/homepage?error=${encodeURIComponent(problem)}`);
  await prisma.$transaction(async (tx) => {
    await publication.ensureHomepagePublishedBaseline(tx, revision.pageId, actor.id);
    await tx.pageSection.deleteMany({ where: { pageId: revision.pageId } });
    await tx.pageSection.createMany({ data: snapshot.sections.map((section) => ({ pageId: revision.pageId, type: section.type, order: section.order, enabled: section.enabled, theme: section.theme, content: section.content as Prisma.InputJsonValue, settings: section.settings === null ? Prisma.JsonNull : section.settings as Prisma.InputJsonValue })) });
    await publication.saveHomepageDraftSnapshot(tx, revision.pageId, actor.id);
  });
  await audit(actor.id, "REVISION_RESTORE", "Page", revision.pageId, { revisionId: revision.id });
  redirect("/admin/homepage?success=revision-restored-to-draft");
}

const galleryInput = z.object({ projectId: z.string().cuid(), mediaId: z.string().cuid(), role: z.enum(["GALLERY", "DETAIL", "MOTION_STILL"]), caption: z.string().trim().max(500).optional().default(""), alt: z.string().trim().max(500).optional().default("") });
export async function addProjectGalleryItem(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = galleryInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/projects?error=invalid-gallery"); const data = parsed.data; const exists = await prisma.projectMedia.findUnique({ where: { projectId_mediaId: { projectId: data.projectId, mediaId: data.mediaId } } }); if (exists) redirect(`/admin/projects/${data.projectId}?error=gallery-duplicate`); await prisma.$transaction(async (tx) => { await ensureProjectBaseline(tx, data.projectId); await tx.projectMedia.create({ data: { projectId: data.projectId, mediaId: data.mediaId, role: data.role, caption: data.caption || null, alt: data.alt || null, order: ((await tx.projectMedia.aggregate({ where: { projectId: data.projectId }, _max: { order: true } }))._max.order ?? -1) + 1 } }); }); await audit(actor.id, "PROJECT_GALLERY_ADDED", "Project", data.projectId); redirect(`/admin/projects/${data.projectId}?success=gallery-added`); }
export async function saveProjectGalleryItem(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent");
  const parsed = galleryInput.omit({mediaId:true}).extend({id:z.string().cuid()}).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/projects?error=invalid-gallery");
  const {id, projectId, role, caption, alt} = parsed.data;
  const item = await prisma.projectMedia.findUnique({where:{id}});
  if (!item || item.projectId !== projectId) redirect("/admin/projects?error=invalid-gallery");
  await prisma.$transaction(async tx => { await ensureProjectBaseline(tx, projectId); await tx.projectMedia.update({where:{id},data:{role,caption:caption||null,alt:alt||null}}); });
  await audit(actor.id,"PROJECT_GALLERY_UPDATED","Project",projectId);
  redirect(`/admin/projects/${projectId}?success=gallery-saved`);
}
export async function removeProjectGalleryItem(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); const projectId = z.string().cuid().safeParse(formData.get("projectId")); if (!id.success || !projectId.success) redirect("/admin/projects?error=invalid-gallery"); const item = await prisma.projectMedia.findUnique({ where: { id: id.data } }); if (!item || item.projectId !== projectId.data) redirect("/admin/projects?error=invalid-gallery"); await prisma.$transaction(async (tx) => { await ensureProjectBaseline(tx, projectId.data); await tx.projectMedia.delete({ where: { id: item.id } }); }); await audit(actor.id, "PROJECT_GALLERY_REMOVED", "Project", projectId.data); redirect(`/admin/projects/${projectId.data}?success=gallery-removed`); }
export async function moveProjectGalleryItem(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); const projectId = z.string().cuid().safeParse(formData.get("projectId")); const direction = z.enum(["up", "down"]).safeParse(formData.get("direction")); if (!id.success || !projectId.success || !direction.success) redirect("/admin/projects?error=invalid-gallery"); const current = await prisma.projectMedia.findUnique({ where: { id: id.data } }); if (!current || current.projectId !== projectId.data) redirect("/admin/projects?error=invalid-gallery"); const sibling = await prisma.projectMedia.findFirst({ where: { projectId: current.projectId, order: direction.data === "up" ? { lt: current.order } : { gt: current.order } }, orderBy: { order: direction.data === "up" ? "desc" : "asc" } }); if (!sibling) redirect(`/admin/projects/${projectId.data}?error=gallery-boundary`); await prisma.$transaction(async (tx) => { await ensureProjectBaseline(tx, projectId.data); await tx.projectMedia.update({ where: { id: current.id }, data: { order: -1 } }); await tx.projectMedia.update({ where: { id: sibling.id }, data: { order: current.order } }); await tx.projectMedia.update({ where: { id: current.id }, data: { order: sibling.order } }); }); await audit(actor.id, "PROJECT_GALLERY_REORDERED", "Project", current.projectId, { direction: direction.data, mediaId: current.mediaId }); redirect(`/admin/projects/${projectId.data}?success=gallery-reordered`); }

const testimonialInput = z.object({ id: z.string().cuid().optional(), quote: z.string().trim().min(5).max(3000), person: z.string().trim().max(120), role: z.string().trim().max(120), company: z.string().trim().max(120), mediaId: z.string().cuid().optional().or(z.literal("")), enabled: z.enum(["true", "false"]).transform((value) => value === "true") });
const clientInput = z.object({ id: z.string().cuid().optional(), name: z.string().trim().min(2).max(160), website: httpsUrlSchema.optional().or(z.literal("")), logoMediaId: z.string().cuid().optional().or(z.literal("")), enabled: z.enum(["true", "false"]).transform((value) => value === "true") });
const orderInput = z.object({ id: z.string().cuid(), direction: z.enum(["up", "down"]) });

async function swapFaqOrder(id: string, direction: "up" | "down") {
  const current = await prisma.fAQ.findUnique({ where: { id } }); if (!current) return false;
  const sibling = await prisma.fAQ.findFirst({ where: { pageKey: current.pageKey, ...(direction === "up" ? { order: { lt: current.order } } : { order: { gt: current.order } }) }, orderBy: { order: direction === "up" ? "desc" : "asc" } }); if (!sibling) return false;
  await prisma.$transaction(async (tx) => { await tx.fAQ.update({ where: { id: current.id }, data: { order: -1 } }); await tx.fAQ.update({ where: { id: sibling.id }, data: { order: current.order } }); await tx.fAQ.update({ where: { id: current.id }, data: { order: sibling.order } }); }); return true;
}

export async function deleteFaq(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); if (!id.success) redirect("/admin/faq?error=invalid-faq"); await prisma.fAQ.delete({ where: { id: id.data } }); await audit(actor.id, "FAQ_DELETED", "FAQ", id.data); await invalidate("public-faq", "public-home"); redirect("/admin/faq?success=deleted"); }
export async function moveFaq(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = orderInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/faq?error=invalid-order"); await swapFaqOrder(parsed.data.id, parsed.data.direction); await audit(actor.id, "FAQ_REORDERED", "FAQ", parsed.data.id); await invalidate("public-faq", "public-home"); redirect("/admin/faq?success=reordered"); }

export async function saveTestimonial(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = testimonialInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/testimonials?error=invalid-testimonial"); const data = parsed.data; const existing = data.id ? await prisma.testimonial.findUnique({ where: { id: data.id } }) : null; if (data.id && !existing) redirect("/admin/testimonials?error=not-found"); const record = data.id ? await prisma.testimonial.update({ where: { id: data.id }, data: { quote: data.quote, person: data.person || null, role: data.role || null, company: data.company || null, mediaId: data.mediaId || null, enabled: data.enabled } }) : await prisma.testimonial.create({ data: { quote: data.quote, person: data.person || null, role: data.role || null, company: data.company || null, mediaId: data.mediaId || null, enabled: data.enabled, order: await prisma.testimonial.count() } }); const event = !data.id ? "TESTIMONIAL_CREATED" : existing!.enabled !== data.enabled ? data.enabled ? "TESTIMONIAL_ENABLED" : "TESTIMONIAL_DISABLED" : "TESTIMONIAL_UPDATED"; await audit(actor.id, event, "Testimonial", record.id); await invalidate("public-testimonials", "public-home"); redirect("/admin/testimonials?success=saved"); }
export async function deleteTestimonial(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); if (!id.success) redirect("/admin/testimonials?error=invalid-testimonial"); await prisma.testimonial.delete({ where: { id: id.data } }); await audit(actor.id, "TESTIMONIAL_DELETED", "Testimonial", id.data); await invalidate("public-testimonials", "public-home"); redirect("/admin/testimonials?success=deleted"); }
export async function moveTestimonial(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = orderInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/testimonials?error=invalid-order"); const current = await prisma.testimonial.findUnique({ where: { id: parsed.data.id } }); if (!current) redirect("/admin/testimonials?error=not-found"); const sibling = await prisma.testimonial.findFirst({ where: { order: parsed.data.direction === "up" ? { lt: current.order } : { gt: current.order } }, orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" } }); if (!sibling) redirect("/admin/testimonials?error=order-boundary"); await prisma.$transaction(async (tx) => { await tx.testimonial.update({ where: { id: current.id }, data: { order: -1 } }); await tx.testimonial.update({ where: { id: sibling.id }, data: { order: current.order } }); await tx.testimonial.update({ where: { id: current.id }, data: { order: sibling.order } }); }); await audit(actor.id, "TESTIMONIAL_REORDERED", "Testimonial", current.id, { direction: parsed.data.direction }); await invalidate("public-testimonials", "public-home"); redirect("/admin/testimonials?success=reordered"); }

export async function saveClient(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = clientInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/clients?error=invalid-client"); const data = parsed.data; const existing = data.id ? await prisma.client.findUnique({ where: { id: data.id } }) : null; if (data.id && !existing) redirect("/admin/clients?error=not-found"); const record = data.id ? await prisma.client.update({ where: { id: data.id }, data: { name: data.name, website: data.website || null, logoMediaId: data.logoMediaId || null, enabled: data.enabled } }) : await prisma.client.create({ data: { name: data.name, website: data.website || null, logoMediaId: data.logoMediaId || null, enabled: data.enabled, order: await prisma.client.count() } }); const event = !data.id ? "CLIENT_CREATED" : existing!.enabled !== data.enabled ? data.enabled ? "CLIENT_ENABLED" : "CLIENT_DISABLED" : "CLIENT_UPDATED"; await audit(actor.id, event, "Client", record.id); await invalidate("public-clients", "public-home"); redirect("/admin/clients?success=saved"); }
export async function deleteClient(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); if (!id.success) redirect("/admin/clients?error=invalid-client"); await prisma.client.delete({ where: { id: id.data } }); await audit(actor.id, "CLIENT_DELETED", "Client", id.data); await invalidate("public-clients", "public-home"); redirect("/admin/clients?success=deleted"); }
export async function moveClient(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = orderInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/clients?error=invalid-order"); const current = await prisma.client.findUnique({ where: { id: parsed.data.id } }); if (!current) redirect("/admin/clients?error=not-found"); const sibling = await prisma.client.findFirst({ where: { order: parsed.data.direction === "up" ? { lt: current.order } : { gt: current.order } }, orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" } }); if (!sibling) redirect("/admin/clients?error=order-boundary"); await prisma.$transaction(async (tx) => { await tx.client.update({ where: { id: current.id }, data: { order: -1 } }); await tx.client.update({ where: { id: sibling.id }, data: { order: current.order } }); await tx.client.update({ where: { id: current.id }, data: { order: sibling.order } }); }); await audit(actor.id, "CLIENT_REORDERED", "Client", current.id, { direction: parsed.data.direction }); await invalidate("public-clients", "public-home"); redirect("/admin/clients?success=reordered"); }

export async function deleteMediaIfUnused(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); if (!id.success) redirect("/admin/media?error=invalid-media"); const result = await getMediaUsage(id.data); if (!result) redirect("/admin/media?error=not-found"); if (result.referenceCount) redirect("/admin/media?error=in-use"); try { await getMediaProvider().delete(result.media.storageKey, result.media.mediaType); } catch { redirect("/admin/media?error=provider-delete-failed"); } await prisma.media.delete({ where: { id: result.media.id } }); await audit(actor.id, "MEDIA_DELETED", "Media", result.media.id); await invalidate("public-home", "public-projects", "public-services", "brand-settings"); redirect("/admin/media?success=deleted"); }

export async function changePassword(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const password = z.string().min(12, "Use at least 12 characters.").max(72).safeParse(formData.get("password"));
  if (!password.success) return { error: "Use a new password between 12 and 72 characters." };
  if (password.data !== formData.get("confirmPassword")) return { error: "The new passwords do not match." };
  if (!await consumeRateLimit("password-change", user.id, 8, 15 * 60_000)) return { error: "Please try again in 15 minutes." };
  const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!await bcrypt.compare(current, stored.passwordHash)) return { error: "The current password is incorrect." };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password.data, 12), passwordChangedAt: new Date(Math.floor(Date.now() / 1000) * 1000 + 1000) } });
    await tx.auditLog.create({ data: { userId: user.id, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id } });
  });
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login?success=password-changed");
}

export async function saveEnquiry(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent");
  const parsed = z.object({ id: z.string().cuid(), status: z.enum(["NEW", "IN_PROGRESS", "REPLIED", "CLOSED"]), internalNotes: z.string().trim().max(8000), archive: z.enum(["true", "false"]).default("false") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/enquiries?error=invalid-enquiry");
  const { id, status, internalNotes, archive } = parsed.data;
  await prisma.$transaction(async (tx) => {
    await tx.contactSubmission.update({ where: { id }, data: { status, internalNotes: internalNotes || null, archivedAt: archive === "true" ? new Date() : null } });
    await tx.auditLog.create({ data: { userId: actor.id, action: archive === "true" ? "ENQUIRY_ARCHIVED" : "ENQUIRY_UPDATED", entityType: "ContactSubmission", entityId: id, metadata: { status } } });
  });
  redirect(`/admin/enquiries/${id}?success=saved`);
}

export async function moveNavigationItem(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const parsed = orderInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/navigation?error=invalid-order");
  await prisma.$transaction(async (tx) => {
    const current = await tx.navigationItem.findUniqueOrThrow({ where: { id: parsed.data.id } });
    const sibling = await tx.navigationItem.findFirst({ where: { navigationId: current.navigationId, order: parsed.data.direction === "up" ? { lt: current.order } : { gt: current.order } }, orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" } });
    if (!sibling) return;
    await tx.navigationItem.update({ where: { id: current.id }, data: { order: -1 } });
    await tx.navigationItem.update({ where: { id: sibling.id }, data: { order: current.order } });
    await tx.navigationItem.update({ where: { id: current.id }, data: { order: sibling.order } });
    await tx.auditLog.create({ data: { userId: actor.id, action: "NAVIGATION_REORDERED", entityType: "NavigationItem", entityId: current.id } });
  });
  await invalidate("public-navigation"); redirect("/admin/navigation?success=reordered");
}

export async function publishProject(formData: FormData) { formData.set("intent", "publish"); return saveProject(formData); }
export async function archiveProject(formData: FormData) { formData.set("intent", "archive"); return saveProject(formData); }
export async function publishService(formData: FormData) { formData.set("intent", "publish"); return saveService(formData); }
export async function archiveService(formData: FormData) { formData.set("intent", "archive"); return saveService(formData); }
