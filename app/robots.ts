import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = SITE_URL;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api/", "/dashboard", "/checkout", "/auth/", "/reset-password"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
