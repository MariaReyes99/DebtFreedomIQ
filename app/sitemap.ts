import type { MetadataRoute } from "next";

const PAGES = ["", "/health", "/help", "/plan", "/whatif", "/whatif/retirement", "/whatif/library", "/whatif/library/how-it-works", "/whatif/library/sources", "/pricing", "/partners", "/support", "/about", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return PAGES.map(p => ({ url: `${site}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.7 }));
}
