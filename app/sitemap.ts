import type { MetadataRoute } from 'next'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { SITE_URL } from '@/lib/site'
import { brandPath, categoryPath, productPath } from '@/lib/shopUrl'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['', '/shop', '/about', '/contact', '/privacy-policy', '/terms-conditions']
  const pages: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }))

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    const [products, categories, brands] = await Promise.all([
      convex.query(api.products.listAll, {}),
      convex.query(api.categories.list, {}),
      convex.query(api.brands.list, {}),
    ])
    const active = products.filter((product) => product.active !== false)

    // Only list category and brand pages that actually have parts on them.
    // A category counts if it or any subcategory has an active product.
    const byId = new Map(categories.map((c) => [c._id, c]))
    const stocked = new Set<string>()
    const brandsWithParts = new Set<string>()
    for (const product of active) {
      brandsWithParts.add(product.brandId)
      let category = byId.get(product.categoryId)
      while (category && !stocked.has(category._id)) {
        stocked.add(category._id)
        category = category.parentId ? byId.get(category.parentId) : undefined
      }
    }

    for (const category of categories) {
      if (category.active === false || !stocked.has(category._id)) continue
      pages.push({ url: `${SITE_URL}${categoryPath(category.slug)}`, lastModified: new Date() })
    }
    for (const brand of brands) {
      if (!brandsWithParts.has(brand._id)) continue
      pages.push({ url: `${SITE_URL}${brandPath(brand.slug)}`, lastModified: new Date() })
    }
    for (const product of active) {
      pages.push({
        url: `${SITE_URL}${productPath(product)}`,
        lastModified: new Date(product._creationTime),
      })
    }
  } catch (error) {
    // Still serve the static pages if the catalogue can't be read.
    console.error('Sitemap: failed to load catalogue', error)
  }

  return pages
}
