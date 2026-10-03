'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, SlidersHorizontal, X, Check } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { motion, AnimatePresence } from 'motion/react'
import { Slider } from '@/components/ui/slider'
import { shopUrl } from '@/lib/shopUrl'
import { useShopFilters } from './useShopFilters'
import { tidyName } from '@/lib/seo'

interface Filters {
  category: string
  brand: string
  model: string
  variant: string
  minPrice: string
  maxPrice: string
  sort: string
}

export default function FilterSidebar() {
  const router = useRouter()
  const urlFilters = useShopFilters()
  const fromUrl = (f: typeof urlFilters): Filters => ({
    category: f.category,
    brand: f.brand,
    model: f.model,
    variant: f.variant,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    sort: f.sort,
  })

  const [filters, setFilters] = useState<Filters>(() => fromUrl(urlFilters))

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    model: true,
    variant: true,
    price: true,
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const dbCategories = useQuery(api.categories.listActive, {})
  const brands = useQuery(api.brands.list)
  
  const selectedBrandDoc = useMemo(() => {
    if (!brands || !filters.brand) return null
    return brands.find((b) => b.slug === filters.brand)
  }, [brands, filters.brand])

  const models = useQuery(api.models.listActive,
    selectedBrandDoc ? { brandId: selectedBrandDoc._id } : "skip"
  )

  const selectedModelDoc = useMemo(() => {
    if (!models || !filters.model) return null
    return models.find((m) => m.slug === filters.model)
  }, [models, filters.model])

  const variants = useQuery(api.variants.listActive,
    selectedModelDoc ? { modelId: selectedModelDoc._id } : "skip"
  )

  const allProducts = useQuery(api.products.listAll, {})

  // Categories in tree order, each with its nesting depth. A category is shown
  // when it or any of its subcategories has active products, so a parent whose
  // products all live in subcategories still appears.
  const categoryOptions = useMemo(() => {
    if (!dbCategories || !allProducts) return []

    const byId = new Map(dbCategories.map((c) => [c._id, c]))
    const visible = new Set<string>()
    for (const product of allProducts) {
      if (product.active === false) continue
      let cat = byId.get(product.categoryId)
      while (cat && !visible.has(cat._id)) {
        visible.add(cat._id)
        cat = cat.parentId ? byId.get(cat.parentId) : undefined
      }
    }

    const shown = dbCategories.filter((c) => visible.has(c._id))
    const ordered: { category: (typeof shown)[number]; depth: number }[] = []
    const walk = (parentId: string | undefined, depth: number) => {
      for (const c of shown) {
        const parent = c.parentId && visible.has(c.parentId) ? c.parentId : undefined
        if (parent !== parentId) continue
        ordered.push({ category: c, depth })
        walk(c._id, depth + 1)
      }
    }
    walk(undefined, 0)
    return ordered
  }, [dbCategories, allProducts])

  // Round the catalog's highest price up to a clean step so the slider has a
  // tidy ceiling instead of an arbitrary number like R15250.
  const priceBounds = useMemo(() => {
    const highest = allProducts?.length
      ? Math.max(...allProducts.map((p) => p.price))
      : 0
    const step = 500
    const max = Math.max(step, Math.ceil(highest / step) * step)
    return { min: 0, max }
  }, [allProducts])

  // Mirrors filters.minPrice/maxPrice while dragging, so the thumb tracks the
  // pointer 1:1 instead of waiting on the debounced URL update to catch up.
  const committedRange: [number, number] = [
    filters.minPrice ? Number(filters.minPrice) : priceBounds.min,
    filters.maxPrice ? Number(filters.maxPrice) : priceBounds.max,
  ]
  const committedKey = committedRange.join('-')
  const [priceRange, setPriceRange] = useState<[number, number]>(committedRange)
  const [prevCommittedKey, setPrevCommittedKey] = useState(committedKey)
  if (committedKey !== prevCommittedKey) {
    setPrevCommittedKey(committedKey)
    setPriceRange(committedRange)
  }

  // Keep filters in sync with the URL. Adjusting state during render (rather
  // than in an effect) avoids the extra cascading render an effect would cause.
  const [prevUrlFilters, setPrevUrlFilters] = useState(urlFilters)
  if (urlFilters !== prevUrlFilters) {
    setPrevUrlFilters(urlFilters)
    setFilters(fromUrl(urlFilters))
  }

  const query = urlFilters.q

  const updateURL = useCallback((newFilters: Filters) => {
    router.replace(shopUrl({ ...newFilters, q: query }), { scroll: false })
  }, [router, query])

  // Link targets for a category or brand option (selecting one also clears
  // the page number; changing brand clears model and variant).
  const categoryHref = (slug: string) => shopUrl({ ...filters, category: slug, q: query })
  const brandHref = (slug: string) => shopUrl({ ...filters, brand: slug, model: '', variant: '', q: query })

  const handleFilterChange = useCallback((updates: Partial<Filters>, immediate = false) => {
    // When parent filter changes, reset children
    if ('brand' in updates) {
      updates.model = ''
      updates.variant = ''
    }
    if ('model' in updates) {
      updates.variant = ''
    }

    const newFilters = { ...filters, ...updates }
    
    if (immediate) {
      setFilters(newFilters)
      updateURL(newFilters)
    } else {
      setFilters(newFilters)
      setTimeout(() => {
        updateURL(newFilters)
      }, 50)
    }
  }, [filters, updateURL])

  const handlePriceSliderCommit = (value: number[]) => {
    const [min, max] = value
    handleFilterChange({
      minPrice: min <= priceBounds.min ? '' : String(min),
      maxPrice: max >= priceBounds.max ? '' : String(max),
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const clearFilters = () => {
    setFilters({
      category: '',
      brand: '',
      model: '',
      variant: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
    })
    router.replace(shopUrl({ q: query }), { scroll: false })
  }

  const hasActiveFilters = filters.category || filters.brand || filters.model || filters.variant || filters.minPrice || filters.maxPrice

  const filterContent = (
    <div className="space-y-5">
      {hasActiveFilters && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {filters.brand && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-md">
                {brands?.find(b => b.slug === filters.brand)?.name}
                <button aria-label="Clear brand filter" onClick={() => handleFilterChange({ brand: '' })} className="inline-flex min-h-6 min-w-6 items-center justify-center hover:text-brand/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.model && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-md">
                {models?.find(m => m.slug === filters.model)?.name}
                <button aria-label="Clear model filter" onClick={() => handleFilterChange({ model: '' })} className="inline-flex min-h-6 min-w-6 items-center justify-center hover:text-brand/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-md">
                {tidyName(categoryOptions.find(({ category }) => category.slug === filters.category)?.category.name ?? '')}
                <button aria-label="Clear category filter" onClick={() => handleFilterChange({ category: '' })} className="inline-flex min-h-6 min-w-6 items-center justify-center hover:text-brand/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {categoryOptions.length > 0 && (
        <>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleSection('category')}
                className="flex items-center gap-2"
              >
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Category</h3>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.category ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {expandedSections.category && (
              <div className="space-y-1">
                {categoryOptions.map(({ category: cat, depth }) => {
                  const isActive = filters.category === cat.slug
                  return (
                    <Link
                      key={cat._id}
                      href={categoryHref(isActive ? '' : cat.slug)}
                      replace
                      scroll={false}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        setFilters({ ...filters, category: isActive ? '' : cat.slug })
                        setMobileFiltersOpen(false)
                      }}
                      style={{ paddingLeft: `${0.5 + depth * 1.5}rem` }}
                      className={`w-full flex items-center gap-3 pr-2 py-1.5 rounded-md cursor-pointer transition-colors text-left ${
                        isActive ? 'bg-brand/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isActive ? 'bg-brand border-brand' : 'border-slate-300'
                      }`}>
                        {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 truncate ${isActive ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                        {tidyName(cat.name)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200" />
        </>
      )}

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => toggleSection('brand')}
            className="flex items-center gap-2"
          >
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Brand</h3>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.brand ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {expandedSections.brand && (
          <div className="space-y-1">
            {brands?.map((brand) => {
              const isActive = filters.brand === brand.slug
              return (
                <Link
                  key={brand._id}
                  href={brandHref(isActive ? '' : brand.slug)}
                  replace
                  scroll={false}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    setFilters({ ...filters, brand: isActive ? '' : brand.slug, model: '', variant: '' })
                    setMobileFiltersOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-left ${
                    isActive ? 'bg-brand/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    isActive ? 'bg-brand border-brand' : 'border-slate-300'
                  }`}>
                    {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`text-sm flex-1 truncate ${isActive ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                    {brand.name}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200" />

      {filters.brand && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleSection('model')}
              className="flex items-center gap-2"
            >
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Model</h3>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.model ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {expandedSections.model && (
            <div className="space-y-1">
              {models?.map((model) => {
                const isActive = filters.model === model.slug
                return (
                  <button
                    key={model._id}
                    onClick={() => handleFilterChange({ model: isActive ? '' : model.slug })}
                    className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-left ${
                      isActive ? 'bg-brand/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isActive ? 'bg-brand border-brand' : 'border-slate-300'
                    }`}>
                      {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-sm flex-1 truncate ${isActive ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                      {model.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {filters.model && (
        <>
          <div className="h-px bg-slate-200" />
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleSection('variant')}
                className="flex items-center gap-2"
              >
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Variant</h3>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.variant ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {expandedSections.variant && (
              <div className="space-y-1">
                {variants?.map((variant) => {
                  const isActive = filters.variant === variant.slug
                  return (
                    <button
                      key={variant._id}
                      onClick={() => handleFilterChange({ variant: isActive ? '' : variant.slug })}
                      className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-left ${
                        isActive ? 'bg-brand/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isActive ? 'bg-brand border-brand' : 'border-slate-300'
                      }`}>
                        {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-sm flex-1 truncate ${isActive ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                        {variant.variantValue}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      <div className="h-px bg-slate-200" />

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => toggleSection('price')}
            className="flex items-center gap-2"
          >
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Price</h3>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {expandedSections.price && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R</span>
                  <input name="minPrice"
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange({ minPrice: e.target.value })}
                    className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">R</span>
                  <input name="maxPrice"
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange({ maxPrice: e.target.value })}
                    className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
                  />
                </div>
              </div>
            </div>
            <div className="pt-1 px-1">
              <Slider
                min={priceBounds.min}
                max={priceBounds.max}
                step={50}
                value={priceRange}
                onValueChange={(value) => setPriceRange(value as [number, number])}
                onValueCommit={handlePriceSliderCommit}
              />
              <div className="flex items-center justify-between mt-2 text-xs font-medium text-slate-500">
                <span>R{priceRange[0].toLocaleString('en-US')}</span>
                <span>
                  R{priceRange[1].toLocaleString('en-US')}
                  {priceRange[1] >= priceBounds.max ? '+' : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200" />

      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Sort</label>
        <select name="sort"
          value={filters.sort}
          onChange={(e) => handleFilterChange({ sort: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name">Name: A-Z</option>
        </select>
      </div>
    </div>
  )

  return (
    <>
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="min-w-5 h-5 px-1 bg-brand text-white text-xs rounded-full flex items-center justify-center">
              {Object.values(filters).filter(v => v && v !== 'newest').length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white z-50 overflow-y-auto lg:hidden shadow-xl"
            >
              <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-lg text-slate-900">Filter</h2>
                <button aria-label="Close filters"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-5">
                {filterContent}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <aside className="lg:w-64 shrink-0 hidden lg:block">
        <div
          className="bg-white rounded-xl border border-slate-200 p-5 sticky top-24"
        >
          <div className="flex items-center gap-2 mb-6">
            <SlidersHorizontal className="w-4 h-4 text-slate-900" />
            <h2 className="font-semibold text-slate-900">Filters</h2>
          </div>
          {filterContent}
        </div>
      </aside>
    </>
  )
}
