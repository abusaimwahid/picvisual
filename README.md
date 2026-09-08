# PicVisual

Next.js portfolio and protected PostgreSQL/Prisma CMS. Public content uses published CMS snapshots; source-backed service/page copy supports database-less builds. Empty project collections never show demo projects.

## Local operation

```sh
npm ci
cp .env.example .env.local
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Set a PostgreSQL connection, a random `AUTH_SECRET`, owner email and a unique bootstrap password before seeding. The seed creates an owner only when none exists and does not overwrite passwords. No database initialization runs at application startup. Sign in at `/admin/login`; change your password in **Your account**.

## Publishing and team workflows

- Homepage: save draft, preview, explicitly publish. Revision restore changes only the draft. Fixed immersive scenes keep their required positions; editorial sections can be reordered.
- Projects and services: Save draft preserves the last published snapshot. Publish applies content, media, gallery, SEO and featured order together. Archive removes public visibility. Changing a published project URL requires acknowledgement.
- Media: upload directly to Cloudinary, verify on the server, then store metadata in PostgreSQL. Images and MP4/WebM videos support the library and in-editor picker. Metadata includes alt text, captions and image focal point. Published snapshots and revision references prevent deletion of used assets.
- Enquiries: contact forms persist leads in the CRM. Search, update status, add private notes and archive. No automatic email delivery is claimed.
- Settings/navigation/branding: changes apply publicly when saved. Only owners manage users; admins manage settings; editors manage content. Add client names, logos and testimonials only with approval.

Approved portfolio: four CHAMOIS images, public project `/work/apparel-color-and-texture`. No client credits, dates, results, before/after source stages or service scope are inferred. `scripts/complete-approved-content.ts` is an intentional content operation, not an automatic seed.

## Production

Use Vercel project `picvisual`, GitHub `abusaimwahid/picvisual`, branch `main`. Required runtime variables: `DATABASE_URL` (Neon with TLS), `AUTH_SECRET`, `SITE_URL`, and the three `CLOUDINARY_*` credentials. `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` are needed only for intentional first-owner bootstrap; remove the bootstrap password from production after verifying owner access.

Use `https://picvisual.vercel.app` as `SITE_URL` until the custom domain is connected. Then choose `https://picvisual.com` as canonical and redirect `www`.

Before deploying, retain a database backup/restore point and review `prisma/migrations`. Apply migrations using `npm run db:deploy`. Never use reset, destructive push, or migrate dev on production. The launch-safety migration only adds columns, a table and indexes. Roll back the application deployment if necessary; preserve additive schema and records. Do not remove published snapshots to roll back application code.

The optional `PICVISUAL_VERIFY_INFRA=1` build gate checks Neon TLS, migration availability and authenticated Cloudinary connectivity without printing credentials. It is read-only and does not initialize or migrate production.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run build
DATABASE_URL='' npm run build
node --env-file=.env.local scripts/secret-scan.cjs
```

Browser scripts in `scripts/*e2e.cjs` are disposable **local-only** QA. They require a running site on port 3000, a local database and owner environment variables. Do not aim them at production. Run mutation suites sequentially; they temporarily change draft content and clean up fixtures. Playwright uses installed Chrome plus downloaded Firefox/WebKit. Evidence and database backups are ignored under `artifacts/` and `.local-backups/`.

Re-run the database-enabled build after the database-less build before starting a production-mode local server. Production smoke tests are separate from local QA and must use approved, reversible changes.
