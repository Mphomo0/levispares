import type { MetadataRoute } from 'next'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { SITE_URL } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['', '/shop', '/about', '/contact', '/privacy-policy', '/terms-conditions']
  const pages: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }))

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    const products = await convex.query(api.products.listAll, {})
    for (const product of products) {
      if (product.active === false) continue
      pages.push({
        url: `${SITE_URL}/products/${product._id}`,
        lastModified: new Date(product._creationTime),
      })
    }
  } catch (error) {
    // Still serve the static pages if the catalogue can't be read.
    console.error('Sitemap: failed to load products', error)
  }

  return pages
}
