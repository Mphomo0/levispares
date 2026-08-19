import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.levispares.co.za'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/shop', '/about', '/contact', '/privacy-policy', '/terms-conditions']

  return staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }))
}
