'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, SlidersHorizontal, X, Check } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

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
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState<Filters>({
    category: '',
    brand: '',
    model: '',
    variant: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
  })

  const [isInitialized, setIsInitialized] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    model: true,
    variant: true,
    price: true,
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [pendingFilter, setPendingFilter] = useState<Partial<Filters> | null>(null)

  const dbCategories = useQuery(api.categories.listActive, {})
  const brands = useQuery(api.brands.list)
  
  const selectedBrandDoc = useMemo(() => {
    if (!brands || !filters.brand) return null
    return (brands as any).find((b: any) => b.slug === filters.brand)
  }, [brands, filters.brand])

  const models = useQuery(api.models.listActive, 
    selectedBrandDoc ? { brandId: selectedBrandDoc._id } : "skip"
  )

  const selectedModelDoc = useMemo(() => {
    if (!models || !filters.model) return null
    return (models as any).find((m: any) => m.slug === filters.model)
  }, [models, filters.model])

  const variants = useQuery(api.variants.listActive,
    selectedModelDoc ? { modelId: selectedModelDoc._id } : "skip"
  )

  const allProducts = useQuery(api.products.listAll, {})

  const categoriesWithProducts = useMemo(() => {
    if (!dbCategories || !allProducts) return []
    
    const productCategoryIds = new Set(allProducts.map((p: any) => p.categoryId))
    return dbCategories.filter((cat) => productCategoryIds.has(cat._id))
  }, [dbCategories, allProducts])

  useEffect(() => {
    setFilters({
      category: searchParams.get('category') || '',
      brand: searchParams.get('brand') || '',
      model: searchParams.get('model') || '',
      variant: searchParams.get('variant') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      sort: searchParams.get('sort') || 'newest',
    })
    setIsInitialized(true)
  }, [searchParams])

  const updateURL = useCallback((newFilters: Filters) => {
    const params = new URLSearchParams()
    if (newFilters.category) params.set('category', newFilters.category)
    if (newFilters.brand) params.set('brand', newFilters.brand)
    if (newFilters.model) params.set('model', newFilters.model)
    if (newFilters.variant) params.set('variant', newFilters.variant)
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice)
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice)
    if (newFilters.sort && newFilters.sort !== 'newest') params.set('sort', newFilters.sort)
    
    const query = searchParams.get('q')
    if (query) params.set('q', query)
    
    const newUrl = `/shop${params.toString() ? `?${params.toString()}` : ''}`
    router.replace(newUrl, { scroll: false })
  }, [router, searchParams])

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
      setPendingFilter(updates)
      setFilters(newFilters)
      setTimeout(() => {
        updateURL(newFilters)
        setPendingFilter(null)
      }, 50)
    }
  }, [filters, updateURL])

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
    const query = searchParams.get('q')
    router.replace(`/shop${query ? `?q=${query}` : ''}`, { scroll: false })
  }

  const hasActiveFilters = filters.category || filters.brand || filters.model || filters.variant || filters.minPrice || filters.maxPrice

  const FilterContent = () => (
    <div className="space-y-5">
      {hasActiveFilters && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {filters.brand && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-md">
                {brands?.find(b => b.slug === filters.brand)?.name}
                <button onClick={() => handleFilterChange({ brand: '' })} className="hover:text-brand/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.model && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-md">
                {models?.find(m => m.slug === filters.model)?.name}
                <button onClick={() => handleFilterChange({ model: '' })} className="hover:text-brand/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand text-xs font-medium rounded-md">
                {categoriesWithProducts?.find(c => c.slug === filters.category)?.name}
                <button onClick={() => handleFilterChange({ category: '' })} className="hover:text-brand/70">
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

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => toggleSection('brand')}
            className="flex items-center gap-2"
          >
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Brand</h3>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.brand ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {expandedSections.brand && (
          <div className="space-y-1">
            {brands?.map((brand) => {
              const isActive = filters.brand === brand.slug
              return (
                <button
                  key={brand._id}
                  onClick={() => handleFilterChange({ brand: isActive ? '' : brand.slug })}
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
                </button>
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
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.model ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {expandedSections.model && (
            <div className="space-y-1">
              {models?.map((model: any) => {
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
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.variant ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {expandedSections.variant && (
              <div className="space-y-1">
                {variants?.map((variant: any) => {
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

      {filters.brand && (
        <>
          <div className="h-px bg-slate-200" />
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleSection('category')}
                className="flex items-center gap-2"
              >
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Category</h3>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.category ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {expandedSections.category && (
              <div className="space-y-1">
                {categoriesWithProducts?.map((cat) => {
                  const isActive = filters.category === cat.slug
                  return (
                    <button
                      key={cat._id}
                      onClick={() => handleFilterChange({ category: isActive ? '' : cat.slug })}
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
                        {cat.name}
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
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {expandedSections.price && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange({ minPrice: e.target.value })}
                    className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange({ maxPrice: e.target.value })}
                    className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleFilterChange({ minPrice: '', maxPrice: '500' })}
                className="px-2 py-1.5 text-xs border border-slate-200 hover:border-brand hover:text-brand rounded-md transition-colors"
              >
                Under R500
              </button>
              <button
                onClick={() => handleFilterChange({ minPrice: '500', maxPrice: '2000' })}
                className="px-2 py-1.5 text-xs border border-slate-200 hover:border-brand hover:text-brand rounded-md transition-colors"
              >
                R500-2k
              </button>
              <button
                onClick={() => handleFilterChange({ minPrice: '2000', maxPrice: '' })}
                className="px-2 py-1.5 text-xs border border-slate-200 hover:border-brand hover:text-brand rounded-md transition-colors"
              >
                R2k+
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200" />

      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Sort</label>
        <select
          value={filters.sort}
          onChange={(e) => handleFilterChange({ sort: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
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
            <span className="w-5 h-5 bg-brand text-white text-xs rounded-full flex items-center justify-center">
              {Object.values(filters).filter(v => v && v !== 'newest').length}
            </span>
          )}
        </button>
      </div>

      {mobileFiltersOpen && (
        <>
          <div
            onClick={() => setMobileFiltersOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
          <div
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white z-50 overflow-y-auto lg:hidden shadow-xl"
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <h2 className="font-semibold text-lg text-slate-900">Filter</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5">
              <FilterContent />
            </div>
          </div>
        </>
      )}

      <aside className="lg:w-64 shrink-0 hidden lg:block">
        <div
          className="bg-white rounded-xl border border-slate-200 p-5 sticky top-24"
        >
          <div className="flex items-center gap-2 mb-6">
            <SlidersHorizontal className="w-4 h-4 text-slate-900" />
            <h2 className="font-semibold text-slate-900">Filters</h2>
          </div>
          <FilterContent />
        </div>
      </aside>
    </>
  )
}
