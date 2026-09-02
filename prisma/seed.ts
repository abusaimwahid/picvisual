import { PrismaClient, PageStatus, ProjectStatus, ServiceStatus, NavigationKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { projects } from "../src/content/work";
import { services } from "../src/content/services";
import { faqs } from "../src/content/faq";
import { site } from "../src/content/site";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const home = await prisma.page.upsert({ where: { slug: "home" }, update: {}, create: { title: "Homepage", slug: "home", pageType: "HOME", status: PageStatus.PUBLISHED, indexable: true, publishedAt: now } });
  const sections = [
    ["hero", { eyebrow: "IMAGE • VIDEO • E-COMMERCE POST", headline: "From raw capture to campaign-ready.", description: "PicVisual transforms product, fashion, beauty and e-commerce assets into polished, brand-ready images and motion — with the consistency modern content teams need.", primaryCta: { label: "View Selected Work", href: "/work" }, secondaryCta: { label: "Start a Test Project", href: "/contact" } }],
    ["positioning", { headline: "Your production partner after the shoot.", body: "From high-volume e-commerce catalogs to campaign imagery and short-form motion, PicVisual gives brands one post-production partner for visual consistency across every channel." }],
    ["capabilities", { serviceIds: [] }], ["beforeAfter", { heading: "Raw in. Refined out." }], ["selectedWork", { heading: "Selected Work", projectIds: [] }], ["motionShowcase", { heading: "Still has momentum." }], ["productionWorkflow", { heading: "Built for visual production at scale.", steps: ["Send", "Prep", "Finish", "Quality check", "Deliver"] }], ["whyPicVisual", { heading: "Built for teams that ship content every day.", items: [] }], ["faq", { heading: "Good work starts clear.", faqIds: [] }], ["cta", { eyebrow: "START A CONVERSATION", heading: "Have content in production?", body: "Let's make it ready for market.", cta: { label: "Start a Project", href: "/contact" } }],
  ] as const;
  for (const [order, [type, content]] of sections.entries()) await prisma.pageSection.upsert({ where: { pageId_order: { pageId: home.id, order } }, update: {}, create: { pageId: home.id, type, order, content } });
  for (const [title, slug, pageType] of [["Work", "work", "WORK"], ["Services", "services", "SERVICES"], ["Studio", "about", "ABOUT"], ["Contact", "contact", "CONTACT"]]) await prisma.page.upsert({ where: { slug }, update: {}, create: { title, slug, pageType, status: PageStatus.PUBLISHED, publishedAt: now } });
  for (const [index, project] of projects.entries()) await prisma.project.upsert({ where: { slug: project.slug }, update: {}, create: { slug: project.slug, title: project.title, category: project.category, summary: project.summary, services: project.services, status: ProjectStatus.PUBLISHED, featured: true, featuredOrder: index, publishedAt: now } });
  for (const [index, service] of services.entries()) { const slug = service.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); await prisma.service.upsert({ where: { slug }, update: {}, create: { slug, title: service.title, category: service.shortTitle, shortDescription: service.description, description: service.items.join("\n"), featured: true, featuredOrder: index, status: ServiceStatus.PUBLISHED } }); }
  for (const [index, [question, answer]] of faqs.entries()) await prisma.fAQ.upsert({ where: { pageKey_order: { pageKey: "home", order: index } }, update: {}, create: { question, answer, order: index, pageKey: "home", enabled: true } });
  const header = await prisma.navigation.upsert({ where: { kind: NavigationKind.HEADER }, update: {}, create: { name: "Header", kind: NavigationKind.HEADER } });
  for (const [index, item] of site.navigation.entries()) await prisma.navigationItem.upsert({ where: { navigationId_order: { navigationId: header.id, order: index } }, update: {}, create: { navigationId: header.id, label: item.label, href: item.href, order: index } });
  await prisma.navigation.upsert({ where: { kind: NavigationKind.FOOTER }, update: {}, create: { name: "Footer", kind: NavigationKind.FOOTER } });
  await prisma.siteSetting.upsert({ where: { key: "global" }, update: {}, create: { key: "global", value: { siteName: site.name, contactEmail: site.email, description: site.description } } });
  const email = process.env.ADMIN_EMAIL?.toLowerCase(); const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (email && password) { const hasOwner = await prisma.user.count({ where: { role: "OWNER" } }); if (hasOwner === 0) { const passwordHash = await bcrypt.hash(password, 12); await prisma.user.create({ data: { email, name: "Site owner", passwordHash, role: "OWNER" } }); } }
}
main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
