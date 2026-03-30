'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import FilterSidebar from '@/components/sections/shop/FilterSidebar'
import ProductGrid from '@/components/sections/shop/ProductGrid'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'

const ITEMS_PER_PAGE = 9

export default function ShopContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)

  const selectedCategory = searchParams.get('category') || undefined
  const searchQuery = searchParams.get('q') || ''
  const selectedBrand = searchParams.get('brand') || undefined
  const selectedModel = searchParams.get('model') || undefined
  const selectedVariant = searchParams.get('variant') || undefined
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
  const sort = searchParams.get('sort') || 'newest'

  const allCategories = useQuery(api.categories.list, {})
  const allBrands = useQuery(api.brands.list, {})
  
  // Get models for the selected brand to find ID by slug
  const selectedBrandDoc = useMemo(() => {
    if (!allBrands || !selectedBrand) return null
    return (allBrands as any).find((b: any) => b.slug === selectedBrand)
  }, [allBrands, selectedBrand])

  const modelsForBrand = useQuery(api.models.listActive, 
    selectedBrandDoc ? { brandId: selectedBrandDoc._id } : "skip"
  )

  const selectedModelDoc = useMemo(() => {
    if (!modelsForBrand || !selectedModel) return null
    return (modelsForBrand as any).find((m: any) => m.slug === selectedModel)
  }, [modelsForBrand, selectedModel])

  const variantsForModel = useQuery(api.variants.listActive,
    selectedModelDoc ? { modelId: selectedModelDoc._id } : "skip"
  )

  const selectedVariantDoc = useMemo(() => {
    if (!variantsForModel || !selectedVariant) return null
    return (variantsForModel as any).find((v: any) => v.slug === selectedVariant)
  }, [variantsForModel, selectedVariant])

  // Convert slug to ID and get name
  const selectedCategoryData = useMemo(() => {
    if (!selectedCategory || !allCategories) return { id: null, name: null }
    const cat = allCategories.find((c: any) => c.slug === selectedCategory)
    return { id: cat?._id || null, name: cat?.name || null }
  }, [selectedCategory, allCategories])

  const selectedCategoryName = selectedCategoryData.name
  const selectedBrandName = selectedBrandDoc?.name || null
  const categoryIdForQuery = selectedCategoryData.id
  const brandIdForQuery = selectedBrandDoc?._id || null
  const modelIdForQuery = selectedModelDoc?._id || null
  const variantIdForQuery = selectedVariantDoc?._id || null

  const hasFilters = brandIdForQuery || minPrice || maxPrice || modelIdForQuery || variantIdForQuery

  useEffect(() => {
    // Reset page to 1 when filters change (except when page itself is changed)
    const pageFromUrl = Number(searchParams.get('page')) || 1
    if (currentPage !== pageFromUrl) {
      setCurrentPage(pageFromUrl)
    }
  }, [searchParams])

  const shopData = useQuery(api.products.listShopNumbered, {
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
    categoryId: categoryIdForQuery ?? undefined,
    brandId: brandIdForQuery ?? undefined,
    modelId: modelIdForQuery ?? undefined,
    variantId: variantIdForQuery ?? undefined,
    minPrice,
    maxPrice,
    searchQuery: searchQuery || undefined,
    sort,
  })

  const results = shopData?.products || []
  const totalPages = shopData?.totalPages || 1
  const totalCount = shopData?.totalCount || 0
  const isLoading = shopData === undefined

  const activeFiltersCount = [
    selectedCategory,
    selectedBrand,
    selectedModel,
    selectedVariant,
    minPrice || maxPrice ? 'price' : null,
  ].filter(Boolean).length

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    router.push(`/shop?${params.toString()}`)
  }, [searchParams, router])

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
                  ? `Showing: ${[selectedCategoryName, selectedBrandName, selectedModelDoc?.name, selectedVariantDoc?.variantValue].filter(Boolean).join(' | ')}`
                  : activeFiltersCount > 0 && !selectedCategoryName && !selectedBrandName
                    ? 'Filtered results'
                    : `Showing results`)
                : `Showing ${totalCount} products available`
            }
          </motion.p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          <FilterSidebar />

          <div className="flex-1">
            <ProductGrid
              products={results}
              selectedCategoryName={selectedCategoryName || ''}
              isLoading={isLoading}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12 pb-12">
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
                          ? 'bg-brand text-white shadow-md'
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
