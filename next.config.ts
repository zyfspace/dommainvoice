import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Upload bukti transfer (maks 5 MB) lewat server action.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
