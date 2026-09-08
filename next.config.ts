import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: { loader: "custom", loaderFile: "./src/lib/media/image-loader.ts", qualities: [75, 90], remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }], formats: ["image/avif", "image/webp"] },
  async headers() { return [{ source: "/:path*", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ] }, { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]; },
};
export default nextConfig;
