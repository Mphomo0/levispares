import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.levispares.co.za'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/api', '/checkout', '/cart'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
