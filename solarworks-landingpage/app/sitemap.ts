import type { MetadataRoute } from "next"

import { siteConfig, mainNav } from "@/lib/site-config"

/**
 * Static sitemap for the public marketing site.
 *
 * Routes are derived from the same nav config the header/footer use, so adding a
 * page to `mainNav` keeps the sitemap in sync. CMS-driven detail pages (projects,
 * stories) are rendered under their section routes via ISR and are crawlable from
 * those listing pages; add explicit dynamic entries here if/when they get their
 * own indexable URLs.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  // path -> crawl priority (1.0 = home, falls off for secondary/legal pages)
  const routes: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    ...mainNav.map((link) => ({ path: link.href, priority: 0.8 })),
    { path: siteConfig.primaryCta.href, priority: 0.9 },
    { path: "/privacy", priority: 0.3 },
  ]

  return routes.map(({ path, priority }) => ({
    url: new URL(path, siteConfig.url).toString(),
    lastModified,
    changeFrequency: priority >= 0.9 ? "weekly" : "monthly",
    priority,
  }))
}
