/**
 * One place that decides what a shop URL looks like, so every link, filter
 * and redirect agrees.
 *
 * A single category or a single brand gets its own indexable page
 * (/shop/category/brakes, /shop/brand/isuzu). Any other combination of
 * filters stays on /shop with query parameters.
 */
export interface ShopFilters {
  category?: string
  brand?: string
  model?: string
  variant?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  q?: string
  page?: number | string
}

const QUERY_ORDER: (keyof ShopFilters)[] = ['category', 'brand', 'model', 'variant', 'minPrice', 'maxPrice', 'sort', 'q', 'page']

function buildQuery(filters: ShopFilters, omit: (keyof ShopFilters)[]) {
  const params = new URLSearchParams()
  for (const key of QUERY_ORDER) {
    if (omit.includes(key)) continue
    const value = filters[key]
    if (value === undefined || value === null || value === '') continue
    if (key === 'sort' && value === 'newest') continue
    if (key === 'page' && Number(value) <= 1) continue
    params.set(key, String(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function categoryPath(slug: string) {
  return `/shop/category/${encodeURIComponent(slug)}`
}

export function brandPath(slug: string) {
  return `/shop/brand/${encodeURIComponent(slug)}`
}

export function shopUrl(filters: ShopFilters = {}): string {
  const { category, brand, q } = filters
  if (category && !brand && !q) return categoryPath(category) + buildQuery(filters, ['category'])
  if (brand && !category && !q) return brandPath(brand) + buildQuery(filters, ['brand'])
  return '/shop' + buildQuery(filters, [])
}

/** Product links use the readable slug when there is one. */
export function productPath(product: { _id: string; slug?: string | null }) {
  return `/products/${product.slug || product._id}`
}

/** Reads the category or brand that a shop path itself selects. */
export function filtersFromPath(pathname: string | null): Pick<ShopFilters, 'category' | 'brand'> {
  const match = pathname?.match(/^\/shop\/(category|brand)\/([^/?#]+)/)
  if (!match) return {}
  const slug = decodeURIComponent(match[2])
  return match[1] === 'category' ? { category: slug } : { brand: slug }
}
