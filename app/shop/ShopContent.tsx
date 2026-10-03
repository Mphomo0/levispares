'use client'

import { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import FilterSidebar from '@/components/sections/shop/FilterSidebar'
import ProductGrid from '@/components/sections/shop/ProductGrid'
import { useShopFilters } from '@/components/sections/shop/useShopFilters'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { shopUrl } from '@/lib/shopUrl'
import { ITEMS_PER_PAGE, shopKey, type ShopInitial, type ShopLink } from '@/lib/shopShared'

export interface ShopContentProps {
  heading: string
  intro: string
  breadcrumb: ShopLink[]
  /** Crawlable links to narrower pages (subcategories, models, …). */
  related?: { label: string; links: ShopLink[] }
  /** Server-rendered first result set, shown until the live query takes over. */
  initial: ShopInitial
}

export default function ShopContent({ heading, intro, breadcrumb, related, initial }: ShopContentProps) {
  const router = useRouter()
  const filters = useShopFilters()
  const {
    category: selectedCategory,
    brand: selectedBrand,
    model: selectedModel,
    variant: selectedVariant,
    q: searchQuery,
    sort,
    page: currentPage,
  } = filters
  const minPrice = filters.minPrice ? Number(filters.minPrice) : undefined
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : undefined

  const allCategories = useQuery(api.categories.list, {})
  const allBrands = useQuery(api.brands.list, {})

  const selectedBrandDoc = useMemo(
    () => (allBrands && selectedBrand ? allBrands.find((b) => b.slug === selectedBrand) ?? null : null),
    [allBrands, selectedBrand],
  )
  const modelsForBrand = useQuery(api.models.listActive, selectedBrandDoc ? { brandId: selectedBrandDoc._id } : 'skip')
  const selectedModelDoc = useMemo(
    () => (modelsForBrand && selectedModel ? modelsForBrand.find((m) => m.slug === selectedModel) ?? null : null),
    [modelsForBrand, selectedModel],
  )
  const variantsForModel = useQuery(api.variants.listActive, selectedModelDoc ? { modelId: selectedModelDoc._id } : 'skip')
  const selectedVariantDoc = useMemo(
    () => (variantsForModel && selectedVariant ? variantsForModel.find((v) => v.slug === selectedVariant) ?? null : null),
    [variantsForModel, selectedVariant],
  )
  const selectedCategoryDoc = useMemo(
    () => (allCategories && selectedCategory ? allCategories.find((c) => c.slug === selectedCategory) ?? null : null),
    [allCategories, selectedCategory],
  )

  // Only query once every slug in the URL has been turned into an id, so we
  // never briefly show unfiltered results.
  const ready =
    (!selectedCategory || allCategories !== undefined) &&
    (!selectedBrand || allBrands !== undefined) &&
    (!selectedModel || !selectedBrandDoc || modelsForBrand !== undefined) &&
    (!selectedVariant || !selectedModelDoc || variantsForModel !== undefined)
  // A category in the URL that does not exist must not silently show everything.
  const categoryNotFound = !!selectedCategory && allCategories !== undefined && !selectedCategoryDoc

  const liveData = useQuery(
    api.products.listShopNumbered,
    !ready || categoryNotFound
      ? 'skip'
      : {
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
          categoryId: selectedCategoryDoc?._id,
          brandId: selectedBrandDoc?._id,
          modelId: selectedModelDoc?._id,
          variantId: selectedVariantDoc?._id,
          minPrice,
          maxPrice,
          searchQuery: searchQuery || undefined,
          sort,
        },
  )

  // Use the server's results while they still describe the current URL.
  const initialMatches = initial.key === shopKey(filters)
  const shopData = liveData ?? (initialMatches ? initial.data : undefined)

  const results = shopData?.products || []
  const totalPages = shopData?.totalPages || 1
  const totalCount = shopData?.totalCount || 0
  const isLoading = shopData === undefined && !categoryNotFound

  const selectedCategoryName = selectedCategoryDoc?.name ?? (initialMatches ? initial.categoryName : null)
  const summary = [
    selectedCategoryName,
    selectedBrandDoc?.name ?? (initialMatches ? initial.brandName : null),
    selectedModelDoc?.name,
    selectedVariantDoc?.variantValue,
  ].filter(Boolean)

  const pageHref = useCallback((page: number) => shopUrl({ ...filters, page }), [filters])

  const handlePageChange = useCallback(
    (page: number) => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      router.push(pageHref(page))
    },
    [router, pageHref],
  )

  return (
    <>
      <div className="hero-gradient text-primary-foreground py-12 md:py-16">
        <div className="container mx-auto px-4">
          {breadcrumb.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-primary-foreground/70">
              <ol className="flex flex-wrap items-center gap-1.5">
                {breadcrumb.map((crumb, index) => (
                  <li key={crumb.href} className="flex items-center gap-1.5">
                    {index > 0 && <span aria-hidden="true">/</span>}
                    {index === breadcrumb.length - 1 ? (
                      <span aria-current="page" className="text-primary-foreground">
                        {crumb.name}
                      </span>
                    ) : (
                      <Link href={crumb.href} className="hover:text-primary-foreground hover:underline underline-offset-4">
                        {crumb.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-4 text-balance">{heading}</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl text-pretty">{intro}</p>
          <p className="mt-3 text-sm text-primary-foreground/60" aria-live="polite">
            {searchQuery
              ? `Search results for “${searchQuery}”`
              : summary.length > 1
                ? `Showing: ${summary.join(' · ')}`
                : shopData
                  ? `${totalCount} ${totalCount === 1 ? 'part' : 'parts'} available`
                  : ' '}
          </p>
          {related && related.links.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold text-primary-foreground/80">{related.label}</h2>
              <ul className="flex flex-wrap gap-2">
                {related.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center rounded-full border border-white/20 px-3 py-1.5 text-sm text-primary-foreground/90 transition-colors hover:border-white/50 hover:text-primary-foreground"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          <FilterSidebar />

          <div className="flex-1">
            <ProductGrid products={results} selectedCategoryName="" isLoading={isLoading} />

            {totalPages > 1 && (
              <nav aria-label="Pagination" className="flex items-center justify-center gap-2 mt-12 pb-12">
                <button
                  aria-label="Previous page"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    // Real links so crawlers can reach every page of results
                    <Link
                      key={page}
                      href={pageHref(page)}
                      scroll={false}
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className={`inline-flex min-w-[40px] h-10 px-3 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page ? 'bg-brand text-white shadow-md' : 'hover:bg-slate-100 text-foreground'
                      }`}
                    >
                      {page}
                    </Link>
                  ))}
                </div>

                <button
                  aria-label="Next page"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
