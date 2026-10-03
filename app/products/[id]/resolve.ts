import { cache } from 'react'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

/**
 * Turns the URL segment (a readable slug, or an older database id) into the
 * product it points at. Null when there is no such active product.
 */
export const resolveProduct = cache(async (ref: string): Promise<{ _id: Id<'products'>; slug: string | null } | null> => {
  try {
    return await fetchQuery(api.products.getByRef, { ref })
  } catch {
    // Older backends without slug support: fall back to id-only lookup.
    try {
      const product = await fetchQuery(api.products.getWithFullHierarchy, { id: ref })
      return product ? { _id: product._id, slug: product.slug ?? null } : null
    } catch {
      return null
    }
  }
})

export const getProductDetails = cache(async (id: Id<'products'>) => {
  try {
    return await fetchQuery(api.products.getWithFullHierarchy, { id })
  } catch {
    return null
  }
})
