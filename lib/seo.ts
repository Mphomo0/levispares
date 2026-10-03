import { SITE_URL } from '@/lib/site'
import { tidyProductName } from '@/convex/lib/names'
import { productPath, type ShopFilters } from '@/lib/shopUrl'
import type { ShopInitial, ShopLink } from '@/lib/shopShared'

export const BRAND_LIST = 'Isuzu, Hino, Fuso, Nissan UD, FAW, Mercedes-Benz'

/**
 * Tidies a catalogue name for headings and titles: trims it, and turns
 * "CORNER PANEL" or "corner panel" into "Corner Panel". Names that already
 * mix cases ("Mercedes-Benz", "UD Trucks") are left as they are.
 */
export function tidyName(name: string) {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  const allCaps = trimmed === trimmed.toUpperCase() && /[A-Z]{3,}/.test(trimmed)
  const allLower = trimmed === trimmed.toLowerCase()
  return allCaps || allLower ? tidyProductName(trimmed) : trimmed
}

export function clip(text: string, max = 158) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

/** Filtered, sorted and searched views are useful to people but not to an index. */
export function isRefinedView(filters: Required<Pick<ShopFilters, 'model' | 'variant' | 'minPrice' | 'maxPrice' | 'sort' | 'q'>>) {
  return !!(filters.model || filters.variant || filters.minPrice || filters.maxPrice || filters.q || filters.sort !== 'newest')
}

export function withPage(path: string, page: number) {
  return page > 1 ? `${path}?page=${page}` : path
}

export function breadcrumbJsonLd(crumbs: ShopLink[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.href}`,
    })),
  }
}

export function collectionJsonLd(name: string, path: string, description: string, initial: ShopInitial) {
  const products = initial.data?.products ?? []
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE_URL}${path}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: initial.data?.totalCount ?? products.length,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}${productPath(product)}`,
        name: product.name,
      })),
    },
  }
}
