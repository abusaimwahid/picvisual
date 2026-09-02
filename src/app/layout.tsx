import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./admin-cms.css";
import "./admin-homepage.css";
import "./home-cms.css";
import "./immersive.css";
import "./immersive-polish.css";
import "./immersive-correction.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export async function generateMetadata(): Promise<Metadata> {
  let favicon: string | undefined;
  let social: string | undefined;

  /*
   * Important for Vercel/static preview deployments:
   * Do not import Prisma-backed branding code unless a database
   * is actually configured. The public site can safely run from
   * the approved fallback content without DATABASE_URL.
   */
  if (process.env.DATABASE_URL) {
    try {
      const { getPublicBrandSettings } = await import("@/lib/brand/settings");
      const brand = await getPublicBrandSettings();

      favicon = brand.favicon?.url;
      social = brand.socialLogo?.url;
    } catch {
      // Branding DB is optional for the public fallback deployment.
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

  return {
    title: "PicVisual — Image & Video Post-Production for Brands & E-commerce",
    description:
      "High-end image and video post-production for e-commerce, fashion, beauty and product brands. Retouching, product editing, motion post and creative finishing by PicVisual.",
    metadataBase: new URL(siteUrl),
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: social ? { images: [{ url: social }] } : undefined,
    twitter: social ? { images: [social] } : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
