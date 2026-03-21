'use client'

import { motion } from 'motion/react'
import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import CategorySidebar from '@/components/sections/shop/CategorySidebar'
import ProductGrid from '@/components/sections/shop/ProductGrid'
import { useSearchParams } from 'next/navigation'

export default function ShopContent() {
  const searchParams = useSearchParams()
  const selectedCategory = searchParams.get('category') || undefined
  const searchQuery = searchParams.get('q') || ''

  const { results, status, loadMore } = usePaginatedQuery(
    (api as any).products.list,
    { category: selectedCategory },
    { initialNumItems: 12 }
  )

  const searchResults = useQuery(
    (api as any).products.search,
    searchQuery ? { query: searchQuery } : "skip"
  )

  const displayProducts = searchQuery ? searchResults : results

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
            {(displayProducts as any)?.length || 0} products available
          </motion.p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
          <CategorySidebar selectedCategory={selectedCategory || ""} />

          <ProductGrid
            products={(displayProducts as any) || []}
            selectedCategory={selectedCategory || ''}
            isLoading={status === 'LoadingFirstPage' || (!!searchQuery && !searchResults)}
          />
        </div>
      </div>
    </>
  )
}
