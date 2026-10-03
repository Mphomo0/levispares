'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { filtersFromPath } from '@/lib/shopUrl'

/**
 * The shop's active filters, read from both the path (/shop/category/x,
 * /shop/brand/y) and the query string. The path wins when both are present.
 */
export function useShopFilters() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useMemo(() => {
    const fromPath = filtersFromPath(pathname)
    return {
      category: fromPath.category ?? searchParams.get('category') ?? '',
      brand: fromPath.brand ?? searchParams.get('brand') ?? '',
      model: searchParams.get('model') ?? '',
      variant: searchParams.get('variant') ?? '',
      minPrice: searchParams.get('minPrice') ?? '',
      maxPrice: searchParams.get('maxPrice') ?? '',
      sort: searchParams.get('sort') ?? 'newest',
      q: searchParams.get('q') ?? '',
      page: Number(searchParams.get('page')) || 1,
    }
  }, [pathname, searchParams])
}

export type ShopFilterState = ReturnType<typeof useShopFilters>
