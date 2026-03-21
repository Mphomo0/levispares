'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { categories } from '@/lib/products'

interface Props {
  selectedCategory: string
}

export default function CategorySidebar({ selectedCategory }: Props) {
  return (
    <>
      {/* Mobile Category Selector - Horizontal Scroll Chips */}
      <div className="lg:hidden -mx-4 px-4 mb-6 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 pb-2 min-w-max">
          <Link
            href="/shop"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              !selectedCategory
                ? 'bg-accent border-accent text-accent-foreground shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            All Parts
          </Link>
          {categories.map((category) => {
            const isActive = selectedCategory === category.id
            return (
              <Link
                key={category.id}
                href={isActive ? '/shop' : `/shop?category=${category.id}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border whitespace-nowrap ${
                  isActive
                    ? 'bg-accent border-accent text-accent-foreground shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <aside className="lg:w-64 shrink-0 hidden lg:block">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card rounded-xl p-6 card-shadow sticky top-24"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Categories</h3>

            {selectedCategory && (
              <Link
                href="/shop"
                className="text-sm text-accent hover:underline"
              >
                Clear
              </Link>
            )}
          </div>

          <div className="space-y-2">
            {categories.map((category, index) => {
              const isActive = selectedCategory === category.id

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    href={isActive ? '/shop' : `/shop?category=${category.id}`}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium">{category.name}</span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </aside>
    </>
  )
}
