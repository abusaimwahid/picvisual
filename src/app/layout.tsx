import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./admin-cms.css";
import "./admin-homepage.css";
import "./admin-workspace.css";
import "./home-cms.css";
import "./homepage.css";
import "./public-inner.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export async function generateMetadata(): Promise<Metadata> {
  const [{ publicSiteUrl, defaultSocialImage }, { getPublicSiteSettings }, { getPublicBrandSettings }] = await Promise.all([import("@/lib/public/seo"), import("@/lib/public/readers"), import("@/lib/brand/settings")]);
  const [url, social, settings, brand] = await Promise.all([publicSiteUrl(), defaultSocialImage(), getPublicSiteSettings(), getPublicBrandSettings()]);
  return { metadataBase: new URL(url), title: settings.data.seoTitle, description: settings.data.description, icons: { icon: brand.favicon?.url || "/brand/picvisual-logo.png" }, openGraph: { ...(social ? { images: [{ url: social }] } : {}), siteName: settings.data.name, type: "website" }, twitter: { card: social ? "summary_large_image" : "summary", ...(social ? { images: [social] } : {}) } };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
