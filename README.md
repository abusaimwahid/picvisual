# PicVisual

PicVisual is a Next.js public portfolio with a PostgreSQL/Prisma CMS foundation. The approved public experience remains file-backed during this migration phase; it is not redesigned by the admin foundation.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

The public site is available at `http://localhost:3000`.

## Database and first owner

1. Create a fresh PostgreSQL database and set `DATABASE_URL` in `.env`.
2. Generate the Prisma client: `npm run db:generate`
3. Review the generated migration, then run: `npm run db:migrate -- --name init_cms`
4. Set `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` (at least 12 characters), and `AUTH_SECRET` in `.env`.
5. Intentionally seed the baseline and first owner: `npm run db:seed`

The seed is idempotent for the approved projects, services, FAQ, global setting, header navigation and Homepage record. It only creates an OWNER when no owner exists; it never logs or overwrites a password.

Sign in at `/admin/login`. The database is never initialized at application boot.

For production, review migration SQL in source control and use `npm run db:deploy`. Do not run reset commands against any unknown or live database. Back up PostgreSQL before schema changes.

## CMS status

Implemented in this phase: PostgreSQL Prisma schema, section schemas/registry, seed/owner bootstrap, signed httpOnly sessions, server-side roles, user management, protected admin routes, dashboard queries, media-provider abstraction, and database models for all planned CMS content.

The public pages still intentionally read from `src/content/` while the database is absent or the visual editors are not complete. `src/lib/adapters/public-content.ts` maps CMS entities to the existing public component shapes for the next migration step. The next phase should implement validated CRUD editors and change public readers to validated database adapters with targeted cache revalidation.

Cloudinary credentials are optional for builds. Upload/delete attempts fail clearly until a signed Cloudinary flow is implemented; raw media is never stored in Postgres.
