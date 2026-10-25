'use client'

import { LazyMotion, MotionConfig } from 'framer-motion'
import { ReactNode } from 'react'

// The animation features download after the page has loaded instead of with
// every page's first JS. domMax (not domAnimation) because the product page
// uses layoutId.
const loadFeatures = () => import('./motionFeatures').then((mod) => mod.default)

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
