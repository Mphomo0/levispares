'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import ProductCard from '@/components/sections/products/ProductCard'

interface Props {
  products: any[]
  selectedCategory: string
  isLoading?: boolean
}

export default function ProductGrid({ products, selectedCategory }: Props) {
  return (
    <div className="flex-1">
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 flex items-center gap-2"
        >
          <span className="text-muted-foreground">Showing:</span>
          <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium capitalize">
            {selectedCategory}
          </span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product, index) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>

      {products.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center py-16"
        >
          <p className="text-muted-foreground text-lg">
            No products found in this category.
          </p>
          <Link
            href="/shop"
            className="mt-4 text-accent hover:underline inline-block"
          >
            View all products
          </Link>
        </motion.div>
      )}
    </div>
  )
}
