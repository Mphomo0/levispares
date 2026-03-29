'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, SlidersHorizontal, X, Check } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface Filters {
  category: string
  brand: string
  minPrice: string
  maxPrice: string
  inStock: boolean
  sort: string
}

export default function FilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState<Filters>({
    category: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    inStock: false,
    sort: 'newest',
  })

  const [isInitialized, setIsInitialized] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    price: true,
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [pendingFilter, setPendingFilter] = useState<Partial<Filters> | null>(null)

  const dbCategories = useQuery(api.categories.listActive, {})
  const brands = useQuery(api.brands.list)
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
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      inStock: searchParams.get('inStock') === 'true',
      sort: searchParams.get('sort') || 'newest',
    })
    setIsInitialized(true)
  }, [searchParams])

  const updateURL = useCallback((newFilters: Filters) => {
    const params = new URLSearchParams()
    if (newFilters.category) params.set('category', newFilters.category)
    if (newFilters.brand) params.set('brand', newFilters.brand)
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice)
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice)
    if (newFilters.inStock) params.set('inStock', 'true')
    if (newFilters.sort && newFilters.sort !== 'newest') params.set('sort', newFilters.sort)
    
    const query = searchParams.get('q')
    if (query) params.set('q', query)
    
    const newUrl = `/shop${params.toString() ? `?${params.toString()}` : ''}`
    router.replace(newUrl, { scroll: false })
  }, [router, searchParams])

  const handleFilterChange = useCallback((updates: Partial<Filters>, immediate = false) => {
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
      minPrice: '',
      maxPrice: '',
      inStock: false,
      sort: 'newest',
    })
    const query = searchParams.get('q')
    router.replace(`/shop${query ? `?q=${query}` : ''}`, { scroll: false })
  }

  const hasActiveFilters = filters.category || filters.brand || filters.minPrice || filters.maxPrice || filters.inStock

  const FilterContent = () => (
    <div className="space-y-6">
      {hasActiveFilters && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear All Filters
        </motion.button>
      )}

      <div className="border-b border-slate-200" />

      <motion.div
        initial={false}
        animate={{ height: 'auto', opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          onClick={() => toggleSection('category')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="font-semibold text-base">Categories</h3>
          <motion.div
            animate={{ rotate: expandedSections.category ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.div>
        </button>
        
        <motion.div
          initial={false}
          animate={{ 
            height: expandedSections.category ? 'auto' : 0,
            opacity: expandedSections.category ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="space-y-1 pb-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFilterChange({ category: '' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                !filters.category
                  ? 'bg-brand text-white'
                  : 'hover:bg-secondary text-foreground'
              }`}
            >
              <span>All Parts</span>
              {!filters.category && <Check className="w-4 h-4 ml-auto" />}
            </motion.button>
            {categoriesWithProducts?.map((cat, index) => {
              const isActive = filters.category === cat._id
              return (
                <motion.button
                  key={cat._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleFilterChange({ category: isActive ? '' : cat.slug })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand text-white'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {isActive && <Check className="w-4 h-4 ml-auto shrink-0" />}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </motion.div>

      <div className="border-b border-slate-200" />

      <motion.div
        initial={false}
        animate={{ height: 'auto', opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          onClick={() => toggleSection('brand')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="font-semibold text-base">Brands</h3>
          <motion.div
            animate={{ rotate: expandedSections.brand ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.div>
        </button>
        
        <motion.div
          initial={false}
          animate={{ 
            height: expandedSections.brand ? 'auto' : 0,
            opacity: expandedSections.brand ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="space-y-1 pb-2 max-h-60 overflow-y-auto">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFilterChange({ brand: '' })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                !filters.brand
                  ? 'bg-brand text-white'
                  : 'hover:bg-secondary text-foreground'
              }`}
            >
              <span>All Brands</span>
              {!filters.brand && <Check className="w-4 h-4 ml-auto" />}
            </motion.button>
            {brands?.map((brand, index) => {
              const isActive = filters.brand === brand._id
              return (
                <motion.button
                  key={brand._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleFilterChange({ brand: isActive ? '' : brand.slug })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand text-white'
                      : 'hover:bg-secondary text-foreground'
                  }`}
                >
                  <span className="truncate">{brand.name}</span>
                  {isActive && <Check className="w-4 h-4 ml-auto shrink-0" />}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </motion.div>

      <div className="border-b border-slate-200" />

      <motion.div
        initial={false}
        animate={{ height: 'auto', opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <h3 className="font-semibold text-base">Price Range</h3>
          <motion.div
            animate={{ rotate: expandedSections.price ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.div>
        </button>
        
        <motion.div
          initial={false}
          animate={{ 
            height: expandedSections.price ? 'auto' : 0,
            opacity: expandedSections.price ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className="space-y-3 pb-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Min</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange({ minPrice: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 mb-1 block">Max</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R</span>
                  <input
                    type="number"
                    placeholder="Any"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange({ maxPrice: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFilterChange({ minPrice: '', maxPrice: '500' })}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Under R500
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFilterChange({ minPrice: '500', maxPrice: '2000' })}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                R500-2k
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFilterChange({ minPrice: '2000', maxPrice: '' })}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                R2k+
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="border-b border-slate-200" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <label className="flex items-center gap-3 cursor-pointer group">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) => handleFilterChange({ inStock: e.target.checked })}
              className="sr-only"
            />
            <motion.div 
              animate={{ 
                backgroundColor: filters.inStock ? 'rgb(249 115 22 / var(--tw-bg-opacity))' : '#e2e8f0'
              }}
              className="w-10 h-6 rounded-full transition-colors"
            >
              <motion.div 
                animate={{ x: filters.inStock ? 20 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
              />
            </motion.div>
          </motion.div>
          <span className="font-medium text-sm">In Stock Only</span>
        </label>
      </motion.div>

      <div className="border-b border-slate-200" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <h3 className="font-semibold text-base mb-3">Sort By</h3>
        <motion.select
          whileTap={{ scale: 0.98 }}
          value={filters.sort}
          onChange={(e) => handleFilterChange({ sort: e.target.value })}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white transition-all"
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name">Name: A-Z</option>
        </motion.select>
      </motion.div>
    </div>
  )

  return (
    <>
      <div className="lg:hidden mb-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setMobileFiltersOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
              !
            </span>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white z-50 overflow-y-auto lg:hidden"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Filters</h2>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              <div className="p-4">
                <FilterContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <aside className="lg:w-72 shrink-0 hidden lg:block">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card rounded-xl p-6 card-shadow sticky top-24"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: hasActiveFilters ? 10 : 0 }}
                transition={{ type: 'spring' }}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </motion.div>
              Filters
            </h2>
          </div>
          <FilterContent />
        </motion.div>
      </aside>
    </>
  )
}
