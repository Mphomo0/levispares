import { cache } from 'react'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { ITEMS_PER_PAGE, shopKey, type ShopInitial } from '@/lib/shopShared'
import type { ShopFilters } from '@/lib/shopUrl'

type SearchParams = Record<string, string | string[] | undefined>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''

/** Normalises Next.js searchParams into shop filters. */
export function readFilters(searchParams: SearchParams): Required<Omit<ShopFilters, 'page'>> & { page: number } {
  return {
    category: first(searchParams.category),
    brand: first(searchParams.brand),
    model: first(searchParams.model),
    variant: first(searchParams.variant),
    minPrice: first(searchParams.minPrice),
    maxPrice: first(searchParams.maxPrice),
    sort: first(searchParams.sort) || 'newest',
    q: first(searchParams.q),
    page: Math.max(1, Number(first(searchParams.page)) || 1),
  }
}

export const getCategories = cache(() => fetchQuery(api.categories.list, {}))
export const getBrands = cache(() => fetchQuery(api.brands.list, {}))

export async function findCategory(slug: string) {
  if (!slug) return null
  const categories = await getCategories()
  const category = categories.find((c) => c.slug === slug)
  return category && category.active !== false ? category : null
}

export async function findBrand(slug: string) {
  if (!slug) return null
  const brands = await getBrands()
  return brands.find((b) => b.slug === slug) ?? null
}

/** Category followed by its ancestors, root first. */
export async function categoryTrail(category: Doc<'categories'>) {
  const categories = await getCategories()
  const byId = new Map(categories.map((c) => [c._id, c]))
  const trail = [category]
  let current = category
  while (current.parentId && byId.get(current.parentId)) {
    current = byId.get(current.parentId)!
    trail.unshift(current)
  }
  return trail
}

export async function childCategories(category: Doc<'categories'>) {
  const categories = await getCategories()
  return categories.filter((c) => c.parentId === category._id && c.active !== false)
}

/** Loads the first page of results the way the client would, for server rendering. */
export async function loadShop(filters: ReturnType<typeof readFilters>): Promise<ShopInitial> {
  const key = shopKey(filters)
  const [category, brand] = await Promise.all([findCategory(filters.category), findBrand(filters.brand)])

  if ((filters.category && !category) || (filters.brand && !brand)) {
    return { key, data: null, categoryName: null, brandName: null }
  }

  const models = brand && filters.model ? await fetchQuery(api.models.listActive, { brandId: brand._id }) : []
  const model = models.find((m) => m.slug === filters.model)
  const variants = model && filters.variant ? await fetchQuery(api.variants.listActive, { modelId: model._id }) : []
  const variant = variants.find((v) => v.slug === filters.variant)

  try {
    const data = await fetchQuery(api.products.listShopNumbered, {
      page: filters.page,
      pageSize: ITEMS_PER_PAGE,
      categoryId: category?._id,
      brandId: brand?._id,
      modelId: model?._id,
      variantId: variant?._id,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      searchQuery: filters.q || undefined,
      sort: filters.sort,
    })
    return { key, data, categoryName: category?.name ?? null, brandName: brand?.name ?? null }
  } catch (error) {
    console.error('Shop: failed to load products', error)
    return { key, data: null, categoryName: category?.name ?? null, brandName: brand?.name ?? null }
  }
}
