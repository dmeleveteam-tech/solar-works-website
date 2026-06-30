import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/site-config"

/**
 * Allow crawling of all public pages; keep API routes (lead intake, chat) out of
 * the index since they are not user-facing content. Points crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
    host: siteConfig.url,
  }
}
