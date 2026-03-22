'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import ProductCard from '@/components/sections/products/ProductCard'

interface Props {
  products: any[]
  selectedCategoryName: string
  isLoading?: boolean
  loadMore?: () => void
  isLoadingMore?: boolean
}

export default function ProductGrid({ products, selectedCategoryName, isLoading, loadMore, isLoadingMore }: Props) {
  return (
    <div className="flex-1">
      {selectedCategoryName && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 flex items-center gap-2"
        >
          <span className="text-muted-foreground">Showing:</span>
          <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium capitalize">
            {selectedCategoryName}
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

      {products.length === 0 && !isLoading && (
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

      {loadMore && products.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-8 py-3 bg-accent hover:bg-accent/90 text-accent-foreground font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading more...
              </>
            ) : (
              'Load More Products'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
