'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export default function AboutStory() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title mb-6">Our Story</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                AutoParts was founded with a simple mission: to provide
                automotive enthusiasts and professionals with access to
                high-quality car parts at competitive prices.
              </p>
              <p>
                What started as a small family-owned shop has grown into one of
                the most trusted names in the automotive parts industry. Over
                the years, we&apos;ve built lasting relationships with customers who
                appreciate our commitment to quality, transparency, and
                exceptional service.
              </p>
              <p>
                Today, we stock over 500,000 parts from leading manufacturers,
                ensuring you can find exactly what you need for any make and
                model. Our extensive inventory includes everything from routine
                maintenance items to performance upgrades and specialty
                components.
              </p>
              <p>
                We understand that your vehicle is more than just
                transportation—it&apos;s an investment, a passion, and often a
                part of your daily life. That&apos;s why we go above and beyond to
                help you find the right parts, at the right price, with the
                support you deserve.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="relative aspect-square bg-secondary rounded-2xl overflow-hidden"
          >
            <Image
              src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc"
              alt="Auto shop"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={false}
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
