'use client'

import { motion } from 'motion/react'
import AboutStory from '@/components/sections/about/AboutStory'
import AboutValues from '@/components/sections/about/AboutValues'
import AboutStats from '@/components/sections/about/AboutStats'

export default function AboutPage() {
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
            ABOUT <span className="text-accent">LEVI TRUCK SPARES</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl"
          >
            Your trusted partner for premium automotive parts. We&apos;re passionate
            about keeping your vehicle running at its best.
          </motion.p>
        </div>
      </div>

      <AboutStory />
      <AboutValues />
      <AboutStats />
    </>
  )
}
