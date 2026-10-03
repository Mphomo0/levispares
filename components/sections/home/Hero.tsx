'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { ArrowRight } from 'lucide-react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import LoadingScene, { LoadingSteps, SceneBackdrop } from './LoadingScene'
import { shopUrl } from '@/lib/shopUrl'

// One easing curve for all hero motion: quick start, long gentle settle.
const EASE = [0.22, 1, 0.36, 1] as const

const selectClass =
  'w-full rounded-lg border border-white/20 bg-white px-4 py-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60'

function VehicleFinder() {
  const router = useRouter()
  const brands = useQuery(api.brands.list)
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const models = useQuery(
    api.models.listActive,
    brandId ? { brandId: brandId as Id<'brands'> } : 'skip',
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const brand = brands?.find((b) => b._id === brandId)
    if (!brand) return
    const model = models?.find((m) => m._id === modelId)
    router.push(shopUrl({ brand: brand.slug, model: model?.slug }))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-[#1b2029]/85 backdrop-blur-md p-3 sm:p-4 border border-white/10 shadow-2xl shadow-black/40"
    >
      <h2 className="mb-2 px-1 text-sm font-semibold text-white">Find parts for your truck</h2>
      {/* One compact row from tablet up, so the truck below gets the room */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:gap-3">
        <div>
          <label htmlFor="finder-make" className="sr-only">
            Make
          </label>
          <select
            id="finder-make"
            name="make"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value)
              setModelId('')
            }}
            className={selectClass}
          >
            <option value="">{brands ? 'Make' : 'Loading…'}</option>
            {brands?.map((brand) => (
              <option key={brand._id} value={brand._id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="finder-model" className="sr-only">
            Model
          </label>
          <select
            id="finder-model"
            name="model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={!brandId || !models}
            className={selectClass}
          >
            <option value="">{brandId ? 'All models' : 'Model'}</option>
            {models?.map((model) => (
              <option key={model._id} value={model._id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!brandId}
          className="btn-accent col-span-2 inline-flex items-center justify-center gap-2 whitespace-nowrap text-white disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1"
        >
          Show parts
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}

function HeroCopy() {
  return (
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-5 lg:gap-14 lg:items-end">
      <div>
        <h1
          className="font-display text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] text-white mb-3 lg:mb-4"
          style={{ fontWeight: 900 }}
        >
          {/* Each line rises out of its own mask */}
          <span className="block overflow-hidden pb-[0.08em]">
            <motion.span
              className="block"
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              Truck spares,
            </motion.span>
          </span>{' '}
          <span className="block overflow-hidden pb-[0.08em]">
            <motion.span
              className="block text-brand"
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.08 }}
            >
              delivered nationwide
            </motion.span>
          </span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          className="hidden sm:block text-base md:text-lg text-white/80 max-w-xl text-pretty"
        >
          Aftermarket parts for Hino, Isuzu, Fuso, Mercedes-Benz, Nissan, FAW and
          more, from brakes to batteries. Pretoria based, shipping across South Africa.
        </motion.p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
      >
        <VehicleFinder />
        <p className="mt-3 hidden sm:block px-1 text-white/75 text-sm">
          Prefer to talk? Call{' '}
          <a href="tel:0127703389" className="font-semibold text-white underline underline-offset-4">
            012 770 3389
          </a>
          <span className="text-white/60"> · Mon–Fri 8am–5pm, Sat 8am–1pm</span>
          {' · '}
          <Link href="/shop" className="text-white/90 underline underline-offset-4 hover:text-white">
            Browse all parts
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default function Hero() {
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLElement>(null)
  const [headerHeight, setHeaderHeight] = useState(128)

  // The site header is sticky, so the pinned stage sits directly below it.
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.5 })
  const staticProgress = useMotionValue(0.7)
  const progress: MotionValue<number> = reduceMotion ? staticProgress : smoothScroll

  // The truck drives in by itself on load; scrolling then loads and sends it off.
  const entry = useMotionValue(0)
  useEffect(() => {
    if (reduceMotion) {
      entry.set(1)
      return
    }
    // Linear in time; the scene applies its own easing to position and pitch.
    const controls = animate(entry, 1, { duration: 2.2, ease: 'linear', delay: 0.15 })
    return () => controls.stop()
  }, [entry, reduceMotion])

  // Once scrolling starts the copy steps aside and the truck takes the stage.
  // It comes straight back when you scroll to the top.
  const contentOpacity = useTransform(progress, [0.005, 0.055], [1, 0])
  const contentY = useTransform(progress, [0.005, 0.055], [0, -28])
  const contentPointer = useTransform(progress, (p) => (p > 0.04 ? 'none' : 'auto'))

  return (
    <section
      ref={containerRef}
      className="relative text-primary-foreground"
      style={reduceMotion ? undefined : { height: '230svh' }}
    >
      <div
        className="sticky flex flex-col overflow-hidden bg-[#141820]"
        style={
          reduceMotion
            ? { top: 0 }
            : { top: headerHeight, height: `calc(100svh - ${headerHeight}px)` }
        }
      >
        <SceneBackdrop progress={progress} />

        {reduceMotion ? (
          <>
            <div className="container mx-auto px-4 pt-6 lg:pt-12 relative z-10">
              <HeroCopy />
            </div>
            <div className="relative h-72 mt-6">
              <LoadingScene progress={progress} entry={entry} />
            </div>
          </>
        ) : (
          <div className="relative flex-1">
            {/* The truck owns the whole stage; the copy sits on top of it */}
            <LoadingScene progress={progress} entry={entry} />
            <motion.div
              className="container mx-auto px-4 pt-5 lg:pt-10 relative z-10"
              style={{ opacity: contentOpacity, y: contentY, pointerEvents: contentPointer }}
            >
              <HeroCopy />
            </motion.div>
          </div>
        )}

        {!reduceMotion && <LoadingSteps progress={progress} />}
      </div>
    </section>
  )
}
