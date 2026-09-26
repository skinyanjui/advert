import type { NextConfig } from "next";

const storageUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const storageHost = storageUrl ? new URL(storageUrl).hostname : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: storageHost ? [{
      protocol: "https",
      hostname: storageHost,
      pathname: "/storage/v1/object/public/listing-photos/**",
    }] : [],
  },
};

export default nextConfig;
