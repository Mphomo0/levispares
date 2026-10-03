'use client'

import { motion } from 'motion/react'
import Hero from '@/components/sections/home/Hero'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import ProductCard from '@/components/sections/products/ProductCard'
import CategoryCard from '@/components/sections/products/CategoryCard'
import BrandCard from '@/components/sections/products/BrandCard'
// import SeedData from '@/components/SeedData'

export default function Home() {
  const featuredProducts = useQuery(api.products.listFeatured)
  const brands = useQuery(api.brands.list)
  const categories = useQuery(api.categories.listTopLevel)

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
              <h2 className="section-title text-balance">Featured parts</h2>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-accent font-medium hover:gap-3 transition mt-4 md:mt-0"
            >
              View all parts <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {!featuredProducts ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse" role="status" aria-label="Loading featured parts">
                  <div className="aspect-square bg-slate-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-1/3 rounded bg-slate-100" />
                    <div className="h-5 w-3/4 rounded bg-slate-100" />
                    <div className="h-6 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
              ))
            ) : (
              featuredProducts.map((product, index) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="h-full"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="section-title text-balance">Shop by category</h2>
            <p className="section-subtitle">Brakes, batteries and more</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(categories ?? []).slice(0, 6).map((category, index) => (
              <motion.div
                key={category._id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white h-full rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <CategoryCard
                  slug={category.slug}
                  name={category.name}
                  icon={category.icon || ''}
                  description={category.description || ''}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brands - Marquee */}
      <section className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="section-title text-balance">Shop by brand</h2>
            <p className="section-subtitle">Choose your truck&apos;s make</p>
          </motion.div>
        </div>

        <div className="relative">
          <div className="flex animate-marquee">
            {!brands ? (
              <div className="flex gap-6 px-4" role="status" aria-label="Loading brands">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 w-40 rounded-xl bg-slate-100 animate-pulse" />)}</div>
            ) : (
              <>
                {brands.map((brand) => (
                  <div key={brand._id} className="flex-shrink-0 mx-6">
                    <BrandCard brand={brand} />
                  </div>
                ))}
                {brands.map((brand) => (
                  <div key={`${brand._id}-dup`} className="flex-shrink-0 mx-6">
                    <BrandCard brand={brand} />
                  </div>
                ))}
              </>
            )}
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
            <h2 className="font-display text-4xl md:text-5xl tracking-wide mb-4 text-balance">
              Can&apos;t find the part you need?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto text-pretty">
              Search the catalogue, or call 012 770 3389 and we&apos;ll help you
              find the right part for your truck.
            </p>
            <Link
              href="/shop"
              className="btn-accent inline-flex items-center gap-2 text-lg text-white"
            >
              Browse all parts <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}
