import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { getPublicBrandSettings } from "@/lib/brand/settings";
import "./globals.css";
import "./admin-cms.css";
import "./admin-homepage.css";
import "./home-cms.css";
import "./immersive.css";
import "./immersive-polish.css";
import "./immersive-correction.css";

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getPublicBrandSettings();
  const social = brand.socialLogo?.url;
  return { title: "PicVisual — Image & Video Post-Production for Brands & E-commerce", description: "High-end image and video post-production for e-commerce, fashion, beauty and product brands. Retouching, product editing, motion post and creative finishing by PicVisual.", metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"), icons: brand.favicon?.url ? { icon: brand.favicon.url } : undefined, openGraph: social ? { images: [{ url: social }] } : undefined, twitter: social ? { images: [social] } : undefined };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${body.variable} ${display.variable}`}><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
