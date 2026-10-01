import type { NextConfig } from "next";

const storageUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageHost = storageUrl ? new URL(storageUrl).hostname : undefined;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // The document policy survives client navigation to /post. Permit same-origin
  // requests; the posting button still requires browser permission before use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: storageHost
      ? [
          {
            protocol: "https",
            hostname: storageHost,
            pathname: "/storage/v1/object/public/listing-photos/**",
          },
          {
            protocol: "https",
            hostname: storageHost,
            pathname: "/storage/v1/object/public/avatars/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
