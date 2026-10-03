import type { FunctionReturnType } from 'convex/server'
import type { api } from '@/convex/_generated/api'

export const ITEMS_PER_PAGE = 12

export interface ShopLink {
  name: string
  href: string
}

export interface ShopInitial {
  /** Identifies the filters these results were loaded for. */
  key: string
  data: FunctionReturnType<typeof api.products.listShopNumbered> | null
  categoryName: string | null
  brandName: string | null
}

interface KeyFilters {
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

/** A stable key for a set of shop filters, shared by server and client. */
export function shopKey(f: KeyFilters) {
  return JSON.stringify([
    f.category || '',
    f.brand || '',
    f.model || '',
    f.variant || '',
    f.minPrice || '',
    f.maxPrice || '',
    f.sort || 'newest',
    f.q || '',
    Number(f.page) || 1,
  ])
}
