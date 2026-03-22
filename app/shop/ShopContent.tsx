'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import FilterSidebar from '@/components/sections/shop/FilterSidebar'
import ProductGrid from '@/components/sections/shop/ProductGrid'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'

const ITEMS_PER_PAGE = 9

export default function ShopContent() {
  const searchParams = useSearchParams()
  
  const [currentPage, setCurrentPage] = useState(1)

  const selectedCategory = searchParams.get('category') || undefined
  const searchQuery = searchParams.get('q') || ''
  const selectedBrand = searchParams.get('brand') || undefined
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
  const inStock = searchParams.get('inStock') === 'true'
  const sort = searchParams.get('sort') || 'newest'

  const allCategories = useQuery(api.categories.list, {})
  const allBrands = useQuery(api.brands.list, {})

  // Convert slug to ID and get name
  const selectedCategoryData = useMemo(() => {
    if (!selectedCategory || !allCategories) return { id: null, name: null }
    const cat = allCategories.find((c: any) => c.slug === selectedCategory)
    return { id: cat?._id || null, name: cat?.name || null }
  }, [selectedCategory, allCategories])

  const selectedBrandData = useMemo(() => {
    if (!selectedBrand || !allBrands) return { id: null, name: null }
    const brand = allBrands.find((b: any) => b.slug === selectedBrand)
    return { id: brand?._id || null, name: brand?.name || null }
  }, [selectedBrand, allBrands])

  const selectedCategoryName = selectedCategoryData.name
  const selectedBrandName = selectedBrandData.name
  const categoryIdForQuery = selectedCategoryData.id
  const brandIdForQuery = selectedBrandData.id

  const hasFilters = brandIdForQuery || minPrice || maxPrice || inStock

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedBrand, minPrice, maxPrice, inStock, sort])

  const { results, status, loadMore } = usePaginatedQuery(
    (api as any).products.list,
    categoryIdForQuery ? { categoryId: categoryIdForQuery } : {},
    { initialNumItems: ITEMS_PER_PAGE }
  )

  const searchResults = useQuery(
    (api as any).products.searchAdvanced,
    searchQuery ? { 
      query: searchQuery,
      brandId: brandIdForQuery || undefined,
      minPrice,
      maxPrice,
      inStock: inStock ? true : undefined
    } : "skip"
  )

  const filteredResults = useQuery(
    (api as any).products.searchAdvanced,
    !searchQuery && hasFilters ? {
      categoryId: categoryIdForQuery || undefined,
      brandId: brandIdForQuery || undefined,
      minPrice,
      maxPrice,
      inStock: inStock ? true : undefined
    } : "skip"
  )

  const allCategoryProducts = useQuery(
    (api as any).products.listAll,
    !searchQuery && brandIdForQuery ? { brandId: brandIdForQuery } : "skip"
  )

  const displayProducts = useMemo(() => {
    let products: any[] = []

    if (searchQuery) {
      products = searchResults || []
    } else if (hasFilters) {
      products = filteredResults || []
    } else {
      products = results || []
    }

    if (products.length > 0) {
      products = [...products].sort((a, b) => {
        switch (sort) {
          case 'price-asc':
            return a.price - b.price
          case 'price-desc':
            return b.price - a.price
          case 'name':
            return (a.name || '').localeCompare(b.name || '')
          case 'newest':
          default:
            return 0
        }
      })
    }

    return products.slice(0, currentPage * ITEMS_PER_PAGE)
  }, [searchQuery, hasFilters, searchResults, filteredResults, results, currentPage, sort])

  const totalProducts = useMemo(() => {
    if (searchQuery) return (searchResults || []).length
    if (hasFilters) return (filteredResults || []).length
    if (brandIdForQuery) return allCategoryProducts?.length || 0
    return results?.length || 0
  }, [searchQuery, hasFilters, searchResults, filteredResults, allCategoryProducts, results, brandIdForQuery])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleLoadMore = useCallback(() => {
    loadMore(ITEMS_PER_PAGE)
    setCurrentPage(prev => prev + 1)
  }, [loadMore])

  const isLoading = Boolean(status === 'LoadingFirstPage' || (!!searchQuery && !searchResults) || (!searchQuery && hasFilters && !filteredResults))

  const activeFiltersCount = [
    selectedCategory,
    selectedBrand,
    minPrice || maxPrice ? 'price' : null,
    inStock ? 'stock' : null
  ].filter(Boolean).length

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE)
  const showPagination = !searchQuery && !hasFilters && totalPages > 1

  return (
    <>
      <div className="hero-gradient text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl tracking-wide mb-6"
          >
            SHOP <span className="text-accent">PARTS</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl"
          >
            {searchQuery 
              ? `Search results for "${searchQuery}"`
              : activeFiltersCount > 0
                ? (selectedCategoryName || selectedBrandName 
                  ? `Showing: ${[selectedCategoryName, selectedBrandName].filter(Boolean).join(' | ')}`
                  : activeFiltersCount > 0 && !selectedCategoryName && !selectedBrandName
                    ? 'Filtered results'
                    : `${totalProducts} products available`)
                : `${totalProducts} products available`
            }
          </motion.p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          <FilterSidebar />

          <div className="flex-1">
            <ProductGrid
              products={displayProducts}
              selectedCategoryName={selectedCategoryName || ''}
              isLoading={isLoading}
            />

            {showPagination && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-slate-100 text-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
