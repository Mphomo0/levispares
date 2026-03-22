'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Shield, Truck, HeadphonesIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function Hero() {
  const storeSettings = useQuery(api.settings.get)
  const freeShippingThreshold = storeSettings?.freeShippingThreshold ?? 750

  return (
    <section className="relative hero-gradient text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-block px-4 py-2 bg-orange-400/20 text-orange-400 rounded-full text-sm font-medium mb-6"
            >
              Premium Quality Parts
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-wider mb-6 leading-tight"
              style={{ fontWeight: 1000 }}
            >
              <span className="text-white block">DRIVE WITH</span>
              <span className="text-orange-400 block mt-1 sm:mt-2">CONFIDENCE</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg md:text-xl text-white/80 mb-8 max-w-xl"
            >
              Premium truck parts for all makes and models. From heavy-duty
              brakes to reliable batteries, we provide everything your truck
              needs to stay powerful, efficient, and road-ready.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/shop"
                className="btn-accent inline-flex items-center justify-center gap-2 text-lg text-white"
              >
                Shop Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
              >
                Learn More
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 bg-linear-to-br from-orange-400/20 to-transparent rounded-3xl" />
              <Image
                src="/images/spares.webp"
                alt="Truck spare parts and automotive components"
                fill
                className="object-contain"
                priority
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-400/30 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">OEM Quality</p>
                    <p className="text-white/70 text-sm">Certified parts</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="flex items-center gap-4 p-4 bg-gray-50/5 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
              <Truck className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Free Shipping</h4>
              <p className="text-sm text-white/70">On orders over R{freeShippingThreshold.toFixed(2)}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex items-center gap-4 p-4 bg-gray-50/5 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Quality Guarantee</h4>
              <p className="text-sm text-white/70">OEM specifications</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex items-center gap-4 p-4 bg-gray-50/5 rounded-xl"
          >
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
              <HeadphonesIcon className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Expert Support</h4>
              <p className="text-sm text-white/70">24/7 assistance</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
