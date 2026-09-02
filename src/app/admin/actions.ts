"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { audit } from "@/lib/audit/log";
import { requireUser } from "@/lib/auth/auth";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { hasDatabaseUrl, prisma } from "@/lib/db/client";
import { requirePermission } from "@/lib/permissions";
import { createUserSchema, loginSchema, updateUserSchema } from "@/lib/validation/admin";
import { brandSettingKeys } from "@/lib/brand/settings";
import { brandAssetKindSchema, type BrandAssetKind, validateBrandAsset } from "@/lib/media/brand-validation";
import { getMediaProvider } from "@/lib/media/provider";
import { mediaMetadataSchema } from "@/lib/media/validation";
import { validateSection } from "@/cms/types/sections";
import type { SectionType } from "@/cms/types/sections";
import { hasAllowedMediaKinds, protectedHomepageSectionTypes, sectionMediaRequirements } from "@/cms/homepage-editor";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export type LoginState = { error?: string };
export type BrandActionState = { error?: string; success?: string };

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return { error: "Admin setup is incomplete. Configure DATABASE_URL and AUTH_SECRET." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
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
  if (target.role === "OWNER" && (nextRole !== "OWNER" || !nextActive)) { const owners = await prisma.user.count({ where: { role: "OWNER", isActive: true } }); if (owners <= 1) redirect("/admin/users?error=last-owner"); }
  await prisma.user.update({ where: { id: target.id }, data: { role: nextRole, isActive: nextActive } });
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
    const stored = await getMediaProvider().upload({ filename: file.name, mimeType: validated.mimeType, fileSize: file.size, bytes });
    const media = await prisma.media.create({ data: { filename: file.name, originalFilename: file.name, storageProvider: "cloudinary", storageKey: stored.storageKey, publicUrl: stored.publicUrl, mimeType: validated.mimeType, mediaType: "IMAGE", fileSize: file.size } });
    await prisma.siteSetting.upsert({ where: { key: brandSettingKeys[kind] }, update: { logoMediaId: media.id, value: { assetType: kind } }, create: { key: brandSettingKeys[kind], logoMediaId: media.id, value: { assetType: kind } } });
    await audit(actor.id, "BRAND_ASSET_REPLACED", "SiteSetting", brandSettingKeys[kind], { asset: kind, mediaId: media.id });
    revalidateTag("brand-settings");
    return { success: `${assetLabel(kind)} updated.` };
  } catch (error) { return { error: error instanceof Error ? error.message : "The asset could not be uploaded." }; }
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

export async function saveProject(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = projectInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/projects?error=invalid-project"); const data = parsed.data; const existing = await prisma.project.findUnique({ where: { slug: data.slug } }); if (existing && existing.id !== data.id) redirect("/admin/projects?error=slug-taken"); const projectData = { title: data.title, slug: data.slug, category: data.category, summary: data.summary, description: data.description || null, services: data.services.split(",").map((item) => item.trim()).filter(Boolean), year: data.year || null, clientName: data.clientName || null, featured: data.featured, featuredOrder: data.featured ? data.featuredOrder ?? 0 : null, heroMediaId: data.heroMediaId || null, thumbnailMediaId: data.thumbnailMediaId || null, beforeMediaId: data.beforeMediaId || null, afterMediaId: data.afterMediaId || null, videoMediaId: data.videoMediaId || null, videoPosterMediaId: data.videoPosterMediaId || null, ogImageId: data.ogImageId || null, seoTitle: data.seoTitle || null, seoDescription: data.seoDescription || null, status: data.status, publishedAt: data.status === "PUBLISHED" ? new Date() : null }; const project = data.id ? await prisma.project.update({ where: { id: data.id }, data: projectData }) : await prisma.project.create({ data: projectData }); await audit(actor.id, data.id ? "PROJECT_UPDATED" : "PROJECT_CREATED", "Project", project.id, { status: project.status }); await invalidate("public-projects", "public-home"); redirect(`/admin/projects/${project.id}?success=saved`); }

export async function saveService(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = serviceInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/services?error=invalid-service"); const data = parsed.data; const existing = await prisma.service.findUnique({ where: { slug: data.slug } }); if (existing && existing.id !== data.id) redirect("/admin/services?error=slug-taken"); const serviceData = { title: data.title, slug: data.slug, category: data.category, shortDescription: data.shortDescription, description: data.description || null, featured: data.featured, featuredOrder: data.featured ? data.featuredOrder ?? 0 : null, heroMediaId: data.heroMediaId || null, thumbnailMediaId: data.thumbnailMediaId || null, ogImageId: data.ogImageId || null, seoTitle: data.seoTitle || null, seoDescription: data.seoDescription || null, status: data.status }; const service = data.id ? await prisma.service.update({ where: { id: data.id }, data: serviceData }) : await prisma.service.create({ data: serviceData }); await audit(actor.id, data.id ? "SERVICE_UPDATED" : "SERVICE_CREATED", "Service", service.id, { status: service.status }); await invalidate("public-services", "public-home"); redirect(`/admin/services/${service.id}?success=saved`); }

export async function saveFaq(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = faqInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/faq?error=invalid-faq"); const data = parsed.data; const faq = data.id ? await prisma.fAQ.update({ where: { id: data.id }, data: { question: data.question, answer: data.answer, enabled: data.enabled } }) : await prisma.fAQ.create({ data: { question: data.question, answer: data.answer, enabled: data.enabled, pageKey: "home", order: await prisma.fAQ.count({ where: { pageKey: "home" } }) } }); await audit(actor.id, data.id ? "FAQ_UPDATED" : "FAQ_CREATED", "FAQ", faq.id); await invalidate("public-faq", "public-home"); redirect("/admin/faq?success=saved"); }

export async function updateEnquiryStatus(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); const status = z.enum(["NEW", "IN_PROGRESS", "REPLIED", "CLOSED"]).safeParse(formData.get("status")); if (!id.success || !status.success) redirect("/admin/enquiries?error=invalid-enquiry"); await prisma.contactSubmission.update({ where: { id: id.data }, data: { status: status.data } }); await audit(actor.id, "ENQUIRY_STATUS_UPDATED", "ContactSubmission", id.data, { status: status.data }); redirect("/admin/enquiries?success=saved"); }

const pageInput = z.object({ id: z.string().cuid(), title: z.string().trim().min(2).max(160), status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]), seoTitle: z.string().trim().max(160), seoDescription: z.string().trim().max(320), body: z.string().trim().max(4000) });
const navigationInput = z.object({ id: z.string().cuid().optional(), label: z.string().trim().min(1).max(60), href: z.string().trim().min(1).max(500), enabled: z.enum(["true", "false"]).transform((value) => value === "true") });
const settingInput = z.object({ siteName: z.string().trim().min(2).max(100), contactEmail: z.string().trim().email().max(200), description: z.string().trim().min(10).max(320) });
const contactInput = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), company: z.string().trim().max(160), projectType: z.string().trim().max(120), estimatedVolume: z.string().trim().max(160), timeline: z.string().trim().max(160), message: z.string().trim().max(4000) });

export async function savePage(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const parsed = pageInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/pages?error=invalid-page"); const data = parsed.data;
  const page = await prisma.page.update({ where: { id: data.id }, data: { title: data.title, status: data.status, seoTitle: data.seoTitle || null, seoDescription: data.seoDescription || null, publishedAt: data.status === "PUBLISHED" ? new Date() : null } });
  const existing = await prisma.pageSection.findFirst({ where: { pageId: page.id, type: "richText" }, orderBy: { order: "asc" } });
  if (data.body) await prisma.pageSection.upsert({ where: { pageId_order: { pageId: page.id, order: existing?.order ?? 0 } }, update: { type: "richText", content: { body: data.body }, enabled: true }, create: { pageId: page.id, type: "richText", order: 0, content: { body: data.body } } });
  await prisma.pageRevision.create({ data: { pageId: page.id, authorId: actor.id, snapshot: { title: data.title, status: data.status, seoTitle: data.seoTitle, seoDescription: data.seoDescription, body: data.body }, note: "Page editor save" } });
  await audit(actor.id, "PAGE_UPDATED", "Page", page.id, { slug: page.slug, status: page.status }); await invalidate("public-pages", page.slug === "home" ? "public-home" : page.slug === "about" ? "public-studio" : "public-contact"); redirect("/admin/pages?success=saved");
}

export async function saveNavigationItem(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const parsed = navigationInput.safeParse(Object.fromEntries(formData)); if (!parsed.success || !(/^\//.test(parsed.data.href) || /^https:\/\//i.test(parsed.data.href))) redirect("/admin/navigation?error=invalid-navigation"); const data = parsed.data;
  const navigation = await prisma.navigation.upsert({ where: { kind: "HEADER" }, update: {}, create: { name: "Header", kind: "HEADER" } });
  const item = data.id ? await prisma.navigationItem.update({ where: { id: data.id }, data: { label: data.label, href: data.href, enabled: data.enabled } }) : await prisma.navigationItem.create({ data: { navigationId: navigation.id, label: data.label, href: data.href, enabled: data.enabled, order: await prisma.navigationItem.count({ where: { navigationId: navigation.id } }) } });
  await audit(actor.id, data.id ? "NAVIGATION_UPDATED" : "NAVIGATION_CREATED", "NavigationItem", item.id); await invalidate("public-navigation"); redirect("/admin/navigation?success=saved");
}

export async function saveSiteSettings(formData: FormData) {
  const actor = requirePermission(await requireUser(), "manageSettings"); const parsed = settingInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/settings?error=invalid-settings");
  await prisma.siteSetting.upsert({ where: { key: "global" }, update: { value: parsed.data }, create: { key: "global", value: parsed.data } }); await audit(actor.id, "SITE_SETTINGS_UPDATED", "SiteSetting", "global"); await invalidate("public-settings"); redirect("/admin/settings?success=saved");
}

export async function uploadMedia(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const file = formData.get("file"); if (!(file instanceof File) || file.size === 0) redirect("/admin/media?error=missing-file");
  const parsed = mediaMetadataSchema.safeParse({ filename: file.name, originalFilename: file.name, mimeType: file.type, fileSize: file.size }); if (!parsed.success) redirect("/admin/media?error=invalid-file");
  try { const stored = await getMediaProvider().upload({ filename: file.name, mimeType: file.type, fileSize: file.size, bytes: new Uint8Array(await file.arrayBuffer()) }); const media = await prisma.media.create({ data: { ...parsed.data, storageProvider: "cloudinary", storageKey: stored.storageKey, publicUrl: stored.publicUrl, mediaType: file.type.startsWith("video/") ? "VIDEO" : "IMAGE" } }); await audit(actor.id, "MEDIA_UPLOADED", "Media", media.id); redirect("/admin/media?success=uploaded"); } catch { redirect("/admin/media?error=storage-unavailable"); }
}

export async function submitContactEnquiry(formData: FormData): Promise<{ error?: string; success?: string; mailto?: string }> {
  const parsed = contactInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const data = parsed.data; if (!hasDatabaseUrl()) return { success: "Email handoff is ready.", mailto: `mailto:hello@picvisual.example?subject=${encodeURIComponent("New PicVisual project enquiry")}&body=${encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company}\n\n${data.message}`)}` };
  try { await prisma.contactSubmission.create({ data: { name: data.name, email: data.email, company: data.company || null, projectType: data.projectType || null, estimatedVolume: data.estimatedVolume || null, timeline: data.timeline || null, message: data.message || null } }); return { success: "Thanks — your enquiry has been received." }; } catch { return { error: "We could not save your enquiry. Please try again." }; }
}

export async function saveHomeSection(formData: FormData) {
  const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); const type = z.enum(["hero", "positioning", "cta"]).safeParse(formData.get("type")); if (!id.success || !type.success) redirect("/admin/homepage?error=invalid-section");
  const enabled = formData.get("enabled") === "true"; let content: unknown;
  if (type.data === "hero") content = validateSection("hero", { eyebrow: String(formData.get("eyebrow") ?? ""), headline: String(formData.get("headline") ?? ""), description: String(formData.get("description") ?? ""), primaryCta: { label: String(formData.get("primaryLabel") ?? ""), href: String(formData.get("primaryHref") ?? "") }, secondaryCta: { label: String(formData.get("secondaryLabel") ?? ""), href: String(formData.get("secondaryHref") ?? "") } });
  else if (type.data === "positioning") content = validateSection("positioning", { headline: String(formData.get("headline") ?? ""), body: String(formData.get("body") ?? "") });
  else content = validateSection("cta", { eyebrow: String(formData.get("eyebrow") ?? ""), heading: String(formData.get("headline") ?? ""), body: String(formData.get("body") ?? ""), cta: { label: String(formData.get("primaryLabel") ?? ""), href: String(formData.get("primaryHref") ?? "") } });
  const jsonContent = content as Prisma.InputJsonValue; const section = await prisma.pageSection.update({ where: { id: id.data }, data: { content: jsonContent, enabled } }); await prisma.pageRevision.create({ data: { pageId: section.pageId, authorId: actor.id, snapshot: { section: type.data, content: jsonContent, enabled }, note: `Homepage ${type.data} update` } }); await audit(actor.id, "HOME_SECTION_UPDATED", "PageSection", section.id, { type: type.data }); await invalidate("public-home", "public-pages"); redirect("/admin/homepage?success=saved");
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
  const jsonContent = content as Prisma.InputJsonValue;
  await prisma.pageSection.update({ where: { id: id.data }, data: { content: jsonContent, enabled: formData.get("enabled") === "true" } });
  await prisma.pageRevision.create({ data: { pageId: section.pageId, authorId: actor.id, snapshot: { section: type.data, content: jsonContent, enabled: formData.get("enabled") === "true" }, note: `Homepage ${type.data} update` } });
  await audit(actor.id, "HOME_SECTION_UPDATED", "PageSection", id.data, { type: type.data }); await invalidate("public-home", "public-pages"); redirect("/admin/homepage?success=section-saved");
}

const immersiveType = z.enum(["imagePost", "videoEdit", "motion", "product", "jewelry", "creative", "development"]);
export async function saveImmersiveHomeSection(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); const type = immersiveType.safeParse(formData.get("type")); if (!id.success || !type.success) redirect("/admin/homepage?error=invalid-section"); const media = (name: string) => { const value = String(formData.get(name) ?? ""); return value || undefined; }; const base = { label: String(formData.get("label") ?? ""), heading: String(formData.get("heading") ?? ""), description: String(formData.get("description") ?? ""), primaryMediaId: media("primaryMediaId"), secondaryMediaId: media("secondaryMediaId"), tertiaryMediaId: media("tertiaryMediaId"), mobileMediaId: media("mobileMediaId"), posterMediaId: media("posterMediaId") }; const content = type.data === "imagePost" ? validateSection(type.data, { ...base, rawMediaId: media("rawMediaId"), finishedMediaId: media("finishedMediaId"), detailMediaIds: [] }) : type.data === "videoEdit" ? validateSection(type.data, { ...base, videoMediaId: media("videoMediaId"), timelineMediaIds: [] }) : validateSection(type.data, base); await prisma.pageSection.update({ where: { id: id.data }, data: { content: content as Prisma.InputJsonValue, enabled: formData.get("enabled") === "true" } }); await audit(actor.id, "HOME_IMMERSIVE_SECTION_UPDATED", "PageSection", id.data, { type: type.data }); await invalidate("public-home", "public-pages"); redirect("/admin/homepage?success=section-saved"); }

const homeSectionType = z.enum(["hero", "positioning", "capabilities", "beforeAfter", "selectedWork", "motionShowcase", "productionWorkflow", "whyPicVisual", "faq", "cta", "textMedia", "gallery", "video", "richText", "imagePost", "videoEdit", "motion", "product", "jewelry", "creative", "development"]);
const homeSectionAction = z.object({ id: z.string().cuid(), direction: z.enum(["up", "down"]).optional() });
const sectionDefaults: Record<z.infer<typeof homeSectionType>, Prisma.InputJsonValue> = { hero: { eyebrow: "", headline: "New hero", description: "", primaryCta: { label: "Explore", href: "/work" } }, positioning: { headline: "New statement", body: "" }, capabilities: { serviceIds: [] }, beforeAfter: { heading: "Raw / refined" }, selectedWork: { heading: "Selected Work", projectIds: [] }, motionShowcase: { heading: "Motion" }, productionWorkflow: { heading: "Workflow", steps: ["Send", "Finish"] }, whyPicVisual: { heading: "Why PicVisual", items: [] }, faq: { heading: "FAQ", faqIds: [] }, cta: { eyebrow: "Start", heading: "New CTA", body: "", cta: { label: "Contact", href: "/contact" } }, textMedia: { heading: "New section", body: "", preset: "editorial" }, gallery: { mediaIds: [], preset: "editorial-collage" }, video: { mediaId: "" }, richText: { body: "" }, imagePost: { label: "IMAGE POST", heading: "New image post", description: "", detailMediaIds: [] }, videoEdit: { label: "VIDEO EDIT", heading: "New video edit", description: "", timelineMediaIds: [] }, motion: { label: "MOTION", heading: "New motion scene", description: "" }, product: { label: "PRODUCT", heading: "New product scene", description: "" }, jewelry: { label: "JEWELRY", heading: "New jewelry scene", description: "" }, creative: { label: "CREATIVE", heading: "New creative scene", description: "" }, development: { label: "INTERACTIVE", heading: "New interactive scene", description: "" } };
export async function addHomeSection(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const type = homeSectionType.safeParse(formData.get("type")); if (!type.success) redirect("/admin/homepage?error=invalid-section-type"); const page = await prisma.page.findUnique({ where: { slug: "home" } }); if (!page) redirect("/admin/homepage?error=missing-home"); const order = await prisma.pageSection.count({ where: { pageId: page.id } }); const section = await prisma.pageSection.create({ data: { pageId: page.id, type: type.data, order, content: sectionDefaults[type.data] } }); await audit(actor.id, "HOME_SECTION_CREATED", "PageSection", section.id, { type: type.data }); await invalidate("public-home", "public-pages"); redirect("/admin/homepage?success=section-added"); }
export async function duplicateHomeSection(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = homeSectionAction.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/homepage?error=invalid-section"); const source = await prisma.pageSection.findUnique({ where: { id: parsed.data.id } }); if (!source) redirect("/admin/homepage?error=not-found"); await prisma.$transaction(async (tx) => { const following = await tx.pageSection.findMany({ where: { pageId: source.pageId, order: { gt: source.order } }, orderBy: { order: "desc" }, select: { id: true, order: true } }); await tx.pageSection.update({ where: { id: source.id }, data: { order: -1 } }); for (const section of following) await tx.pageSection.update({ where: { id: section.id }, data: { order: section.order + 1 } }); await tx.pageSection.update({ where: { id: source.id }, data: { order: source.order } }); await tx.pageSection.create({ data: { pageId: source.pageId, type: source.type, order: source.order + 1, enabled: false, theme: source.theme, content: source.content as Prisma.InputJsonValue, settings: source.settings === null ? Prisma.JsonNull : source.settings as Prisma.InputJsonValue } }); }); await audit(actor.id, "HOME_SECTION_DUPLICATED", "PageSection", source.id, { type: source.type }); await invalidate("public-home", "public-pages"); redirect("/admin/homepage?success=section-duplicated"); }
export async function deleteHomeSection(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = homeSectionAction.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/homepage?error=invalid-section"); const section = await prisma.pageSection.findUnique({ where: { id: parsed.data.id } }); if (!section || protectedHomepageSectionTypes.has(section.type)) redirect("/admin/homepage?error=protected-section"); await prisma.$transaction(async (tx) => { await tx.pageSection.delete({ where: { id: section.id } }); await tx.pageSection.updateMany({ where: { pageId: section.pageId, order: { gt: section.order } }, data: { order: { decrement: 1 } } }); }); await audit(actor.id, "HOME_SECTION_DELETED", "PageSection", section.id, { type: section.type }); await invalidate("public-home", "public-pages"); redirect("/admin/homepage?success=section-deleted"); }
export async function moveHomeSection(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = homeSectionAction.safeParse(Object.fromEntries(formData)); if (!parsed.success || !parsed.data.direction) redirect("/admin/homepage?error=invalid-order"); const current = await prisma.pageSection.findUnique({ where: { id: parsed.data.id } }); if (!current) redirect("/admin/homepage?error=not-found"); const sibling = await prisma.pageSection.findFirst({ where: { pageId: current.pageId, ...(parsed.data.direction === "up" ? { order: { lt: current.order } } : { order: { gt: current.order } }) }, orderBy: { order: parsed.data.direction === "up" ? "desc" : "asc" } }); if (!sibling) redirect("/admin/homepage?error=order-boundary"); await prisma.$transaction(async (tx) => { await tx.pageSection.update({ where: { id: current.id }, data: { order: -1 } }); await tx.pageSection.update({ where: { id: sibling.id }, data: { order: current.order } }); await tx.pageSection.update({ where: { id: current.id }, data: { order: sibling.order } }); }); await audit(actor.id, "HOME_SECTION_REORDERED", "PageSection", current.id, { direction: parsed.data.direction }); await invalidate("public-home", "public-pages"); redirect("/admin/homepage?success=section-moved"); }

const galleryInput = z.object({ projectId: z.string().cuid(), mediaId: z.string().cuid(), role: z.enum(["GALLERY", "DETAIL", "MOTION_STILL"]), caption: z.string().trim().max(500).optional().default(""), alt: z.string().trim().max(500).optional().default("") });
export async function addProjectGalleryItem(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = galleryInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/projects?error=invalid-gallery"); const data = parsed.data; const exists = await prisma.projectMedia.findUnique({ where: { projectId_mediaId: { projectId: data.projectId, mediaId: data.mediaId } } }); if (exists) redirect(`/admin/projects/${data.projectId}?error=gallery-duplicate`); await prisma.projectMedia.create({ data: { projectId: data.projectId, mediaId: data.mediaId, role: data.role, caption: data.caption || null, alt: data.alt || null, order: await prisma.projectMedia.count({ where: { projectId: data.projectId } }) } }); await audit(actor.id, "PROJECT_GALLERY_ADDED", "Project", data.projectId); await invalidate("public-projects"); redirect(`/admin/projects/${data.projectId}?success=gallery-added`); }
export async function removeProjectGalleryItem(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); const projectId = z.string().cuid().safeParse(formData.get("projectId")); if (!id.success || !projectId.success) redirect("/admin/projects?error=invalid-gallery"); await prisma.projectMedia.delete({ where: { id: id.data } }); await audit(actor.id, "PROJECT_GALLERY_REMOVED", "Project", projectId.data); await invalidate("public-projects"); redirect(`/admin/projects/${projectId.data}?success=gallery-removed`); }

const testimonialInput = z.object({ id: z.string().cuid().optional(), quote: z.string().trim().min(5).max(3000), person: z.string().trim().max(120), role: z.string().trim().max(120), company: z.string().trim().max(120), mediaId: z.string().cuid().optional().or(z.literal("")), enabled: z.enum(["true", "false"]).transform((value) => value === "true") });
const clientInput = z.object({ id: z.string().cuid().optional(), name: z.string().trim().min(2).max(160), website: z.string().trim().url().optional().or(z.literal("")), logoMediaId: z.string().cuid().optional().or(z.literal("")), enabled: z.enum(["true", "false"]).transform((value) => value === "true") });
const orderInput = z.object({ id: z.string().cuid(), direction: z.enum(["up", "down"]) });

async function swapFaqOrder(id: string, direction: "up" | "down") {
  const current = await prisma.fAQ.findUnique({ where: { id } }); if (!current) return false;
  const sibling = await prisma.fAQ.findFirst({ where: { pageKey: current.pageKey, ...(direction === "up" ? { order: { lt: current.order } } : { order: { gt: current.order } }) }, orderBy: { order: direction === "up" ? "desc" : "asc" } }); if (!sibling) return false;
  await prisma.$transaction(async (tx) => { await tx.fAQ.update({ where: { id: current.id }, data: { order: -1 } }); await tx.fAQ.update({ where: { id: sibling.id }, data: { order: current.order } }); await tx.fAQ.update({ where: { id: current.id }, data: { order: sibling.order } }); }); return true;
}

export async function deleteFaq(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); if (!id.success) redirect("/admin/faq?error=invalid-faq"); await prisma.fAQ.delete({ where: { id: id.data } }); await audit(actor.id, "FAQ_DELETED", "FAQ", id.data); await invalidate("public-faq", "public-home"); redirect("/admin/faq?success=deleted"); }
export async function moveFaq(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = orderInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/faq?error=invalid-order"); await swapFaqOrder(parsed.data.id, parsed.data.direction); await audit(actor.id, "FAQ_REORDERED", "FAQ", parsed.data.id); await invalidate("public-faq", "public-home"); redirect("/admin/faq?success=reordered"); }

export async function saveTestimonial(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = testimonialInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/testimonials?error=invalid-testimonial"); const data = parsed.data; const record = data.id ? await prisma.testimonial.update({ where: { id: data.id }, data: { quote: data.quote, person: data.person || null, role: data.role || null, company: data.company || null, mediaId: data.mediaId || null, enabled: data.enabled } }) : await prisma.testimonial.create({ data: { quote: data.quote, person: data.person || null, role: data.role || null, company: data.company || null, mediaId: data.mediaId || null, enabled: data.enabled, order: await prisma.testimonial.count() } }); await audit(actor.id, data.id ? "TESTIMONIAL_UPDATED" : "TESTIMONIAL_CREATED", "Testimonial", record.id); await invalidate("public-testimonials", "public-home"); redirect("/admin/testimonials?success=saved"); }
export async function deleteTestimonial(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); if (!id.success) redirect("/admin/testimonials?error=invalid-testimonial"); await prisma.testimonial.delete({ where: { id: id.data } }); await audit(actor.id, "TESTIMONIAL_DELETED", "Testimonial", id.data); await invalidate("public-testimonials", "public-home"); redirect("/admin/testimonials?success=deleted"); }

export async function saveClient(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const parsed = clientInput.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/admin/clients?error=invalid-client"); const data = parsed.data; const record = data.id ? await prisma.client.update({ where: { id: data.id }, data: { name: data.name, website: data.website || null, logoMediaId: data.logoMediaId || null, enabled: data.enabled } }) : await prisma.client.create({ data: { name: data.name, website: data.website || null, logoMediaId: data.logoMediaId || null, enabled: data.enabled, order: await prisma.client.count() } }); await audit(actor.id, data.id ? "CLIENT_UPDATED" : "CLIENT_CREATED", "Client", record.id); await invalidate("public-clients", "public-home"); redirect("/admin/clients?success=saved"); }
export async function deleteClient(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); if (!id.success) redirect("/admin/clients?error=invalid-client"); await prisma.client.delete({ where: { id: id.data } }); await audit(actor.id, "CLIENT_DELETED", "Client", id.data); await invalidate("public-clients", "public-home"); redirect("/admin/clients?success=deleted"); }

export async function deleteMediaIfUnused(formData: FormData) { const actor = requirePermission(await requireUser(), "editContent"); const id = z.string().cuid().safeParse(formData.get("id")); if (!id.success) redirect("/admin/media?error=invalid-media"); const media = await prisma.media.findUnique({ where: { id: id.data }, include: { projectHeroes: true, projectThumbnails: true, projectBefore: true, projectAfter: true, projectVideos: true, projectVideoPosters: true, projectOgImages: true, projectMedia: true, serviceHeroes: true, serviceThumbnails: true, serviceOgImages: true, testimonialMedia: true, clientLogos: true, settingLogo: true, pageOgImages: true } }); if (!media) redirect("/admin/media?error=not-found"); const references = [media.projectHeroes, media.projectThumbnails, media.projectBefore, media.projectAfter, media.projectVideos, media.projectVideoPosters, media.projectOgImages, media.projectMedia, media.serviceHeroes, media.serviceThumbnails, media.serviceOgImages, media.testimonialMedia, media.clientLogos, media.settingLogo, media.pageOgImages].reduce((count, items) => count + items.length, 0); if (references) redirect("/admin/media?error=in-use"); await getMediaProvider().delete(media.storageKey); await prisma.media.delete({ where: { id: media.id } }); await audit(actor.id, "MEDIA_DELETED", "Media", media.id); redirect("/admin/media?success=deleted"); }
