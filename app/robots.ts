import type { MetadataRoute } from "next";

/** Dashboard internal: semua crawler dilarang. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
