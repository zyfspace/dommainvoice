import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Noindex untuk semua respons (halaman, API, file), bukan cuma halaman HTML yang punya meta robots.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }];
  },
  experimental: {
    // Upload bukti transfer (maks 5 MB) lewat server action.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
