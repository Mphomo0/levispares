'use client'

import { motion } from 'motion/react'
import Hero from '@/components/sections/home/Hero'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { categories } from '@/lib/products'
import ProductCard from '@/components/sections/products/ProductCard'
import CategoryCard from '@/components/sections/products/CategoryCard'
// import SeedData from '@/components/SeedData'

export default function Home() {
  const featuredProducts = useQuery((api as any).products.listFeatured)

  return (
    <>
      {/* <SeedData /> */}
      <Hero />

      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between mb-10"
          >
            <div>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-subtitle">Top picks from our collection</p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-accent font-medium hover:gap-3 transition-all mt-4 md:mt-0"
            >
              View All Products <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {!featuredProducts ? (
              <p>Loading featured products...</p>
            ) : (
              (featuredProducts as any[]).map((product: any, index: number) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24 bg-blue-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="section-title">Shop by Category</h2>
            <p className="section-subtitle">
              Find the perfect parts for your vehicle
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white h-full rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <CategoryCard {...category} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              READY TO <span className="text-accent">UPGRADE?</span>
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Browse our extensive collection of premium car parts and
              accessories. Quality you can trust, prices you&apos;ll love.
            </p>
            <Link
              href="/shop"
              className="btn-accent inline-flex items-center gap-2 text-lg text-white"
            >
              Start Shopping <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}
