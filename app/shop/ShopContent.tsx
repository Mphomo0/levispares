'use client'

import { motion } from 'motion/react'
import { products } from '@/lib/products'
import CategorySidebar from '@/components/sections/shop/CategorySidebar'
import ProductGrid from '@/components/sections/shop/ProductGrid'
import { useSearchParams } from 'next/navigation'

export default function ShopContent() {
  const searchParams = useSearchParams()
  const selectedCategory = searchParams.get('category') || ''

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products

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
            {products.length} products available
          </motion.p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <CategorySidebar selectedCategory={selectedCategory} />

          <ProductGrid
            products={filteredProducts}
            selectedCategory={selectedCategory}
          />
        </div>
      </div>
    </>
  )
}
