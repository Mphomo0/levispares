'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'motion/react'

function AnimatedNumber({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const numericValue = parseInt(value.replace(/\D/g, ''))
  const hasPlus = value.includes('+')
  const hasPercent = value.includes('%')

  const spring = useSpring(0, { duration: 2000, bounce: 0 })
  const display = useTransform(spring, (current) => {
    const num = Math.floor(current)
    let result = num.toString()
    if (hasPlus) result += '+'
    if (hasPercent) result += '%'
    return result
  })

  useEffect(() => {
    if (isInView && numericValue) {
      spring.set(numericValue)
    }
  }, [isInView, numericValue, spring])

  if (!numericValue) {
    return <span>{value}</span>
  }

  return <motion.span ref={ref}>{display}</motion.span>
}

export default function AboutStats() {
  const stats = [
    { number: '15+', label: 'Years in Business' },
    { number: '300+', label: 'Parts in Stock' },
    { number: '500+', label: 'Happy Customers' },
    { number: '99%', label: 'Satisfaction Rate' },
  ]

  return (
    <section className="py-16 md:py-24 hero-gradient text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              viewport={{ once: true }}
            >
              <div className="font-display text-4xl md:text-5xl text-accent mb-2">
                <AnimatedNumber value={stat.number} />
              </div>
              <div className="text-primary-foreground/70">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
