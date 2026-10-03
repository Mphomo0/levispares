'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  easeIn,
  easeOut,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'motion/react'

interface SceneProps {
  /** Scroll progress through the hero, 0 to 1. */
  progress: MotionValue<number>
  /** 0 to 1 over the drive-in on page load (linear in time). */
  entry: MotionValue<number>
}

// ---------------------------------------------------------------------------
// Timeline. Everything is keyed to scroll progress so the story can be
// scrubbed back and forth.
// ---------------------------------------------------------------------------
const LOAD_START = 0.07
const LOAD_STEP = 0.055
const LOAD_LENGTH = 0.09
/** Fraction of a part's window spent falling; the rest is the settle. */
const FALL = 0.75
const EXIT_START = 0.76

export const STEPS = [
  { label: 'Choose your part', from: 0 },
  { label: 'Picked and packed', from: LOAD_START },
  { label: 'On its way', from: EXIT_START },
]

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
const easeInQuad = (t: number) => t * t

// ---------------------------------------------------------------------------
// Truck photo geometry (truck.webp is 1600x662).
// ---------------------------------------------------------------------------
const PHOTO_W = 1600
const PHOTO_H = 662
const WHEELS = [
  { cx: 432.5, cy: 539, r: 116 },
  { cx: 1311.5, cy: 541, r: 119 },
]
/** The flatbed deck sits about 53% of the way down the photo. */
const DECK_BOTTOM = 46.5

interface PartConfig {
  src: string
  alt: string
  width: number
  height: number
  /** Left edge, % of truck width. */
  left: number
  /** Width, % of truck width. */
  size: number
  /** Extra lift above the deck, % of truck height (stacked parts). */
  lift?: number
  /** Tilt while in the air and at rest, degrees. */
  airTilt: number
  restTilt: number
}

// Loaded the way a real flatbed is: front of the bed (by the cab) first,
// bottom layer before the top layer. Lifts are the height of the part
// underneath, as % of truck height.
const PARTS: PartConfig[] = [
  // Bottom layer
  { src: '/images/hero/alternator.webp', alt: '', width: 560, height: 473, left: 55, size: 8, airTilt: 10, restTilt: 0 },
  { src: '/images/hero/disc.webp', alt: '', width: 560, height: 691, left: 47, size: 7, airTilt: 12, restTilt: 1.5 },
  { src: '/images/hero/clutch.webp', alt: '', width: 560, height: 533, left: 37.5, size: 8.5, airTilt: -9, restTilt: 0 },
  { src: '/images/hero/battery.webp', alt: '', width: 560, height: 430, left: 25.5, size: 10, airTilt: -8, restTilt: -0.5 },
  { src: '/images/hero/tyre.webp', alt: '', width: 560, height: 582, left: 15, size: 9, airTilt: 9, restTilt: 0.5 },
  { src: '/images/hero/shock.webp', alt: '', width: 81, height: 560, left: 13, size: 1.9, airTilt: -8, restTilt: -3 },
  { src: '/images/hero/carton.webp', alt: '', width: 560, height: 513, left: 1.5, size: 11, airTilt: -7, restTilt: -1 },
  // Top layer
  { src: '/images/hero/pads.webp', alt: '', width: 560, height: 559, left: 56.5, size: 5.5, lift: 16, airTilt: 14, restTilt: 1 },
  { src: '/images/hero/filter.webp', alt: '', width: 560, height: 796, left: 39.5, size: 4.5, lift: 19, airTilt: -10, restTilt: 0 },
  { src: '/images/hero/headlamp.webp', alt: '', width: 560, height: 293, left: 25.5, size: 9.5, lift: 18.3, airTilt: 8, restTilt: -1 },
  { src: '/images/hero/carton.webp', alt: '', width: 560, height: 513, left: 3, size: 8.5, lift: 24, airTilt: 10, restTilt: 2 },
]

const landingAt = (index: number) => LOAD_START + index * LOAD_STEP + LOAD_LENGTH * FALL

function Part({ part, index, progress }: { part: PartConfig; index: number; progress: MotionValue<number> }) {
  const start = LOAD_START + index * LOAD_STEP
  const land = start + LOAD_LENGTH * FALL
  const bounce = start + LOAD_LENGTH * 0.87
  const end = start + LOAD_LENGTH

  // Falls in an arc from the warehouse side (right): x eases out while y
  // accelerates down, then a small bounce as it settles on the deck.
  const x = useTransform(progress, [start, land], ['26cqw', '0cqw'], { clamp: true, ease: easeOut })
  const y = useTransform(progress, [start, land, bounce, end], ['-95cqh', '0cqh', '-1.2cqh', '0cqh'], {
    clamp: true,
    ease: [easeIn, easeOut, easeIn],
  })
  const rotate = useTransform(progress, [start, land, bounce, end], [part.airTilt, part.restTilt + 1.5, part.restTilt - 0.5, part.restTilt], {
    clamp: true,
  })
  const scale = useTransform(progress, [start, land], [1.15, 1], { clamp: true })

  // A soft shadow on the deck firms up as the part comes down to meet it.
  const shadowOpacity = useTransform(progress, [start + LOAD_LENGTH * 0.35, land], [0, 0.55], { clamp: true })
  const shadowScale = useTransform(progress, [start + LOAD_LENGTH * 0.35, land], [0.4, 1], { clamp: true })

  const bottom = `${DECK_BOTTOM + (part.lift ?? 0)}%`

  return (
    <>
      <motion.div
        className="absolute h-[5%] rounded-[50%]"
        style={{
          left: `${part.left}%`,
          width: `${part.size}%`,
          bottom: `calc(${bottom} - 2%)`,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7), transparent 70%)',
          opacity: shadowOpacity,
          scaleX: shadowScale,
        }}
      />
      <motion.div
        className="absolute will-change-transform"
        style={{ left: `${part.left}%`, width: `${part.size}%`, bottom, x, y, rotate, scale, transformOrigin: '50% 100%' }}
      >
        <Image
          src={part.src}
          alt={part.alt}
          width={part.width}
          height={part.height}
          sizes="140px"
          unoptimized
          className="block h-auto w-full [filter:drop-shadow(0_6px_6px_rgba(0,0,0,0.45))]"
        />
      </motion.div>
    </>
  )
}

/**
 * Spins with the truck. Each wheel is a circular window onto the truck photo
 * itself, so at rest it lines up exactly with the photo underneath.
 */
function Wheel({ wheel, rotate }: { wheel: (typeof WHEELS)[number]; rotate: MotionValue<number> }) {
  const d = wheel.r * 2
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${((wheel.cx - wheel.r) / PHOTO_W) * 100}%`,
        top: `${((wheel.cy - wheel.r) / PHOTO_H) * 100}%`,
        width: `${(d / PHOTO_W) * 100}%`,
        aspectRatio: '1',
        backgroundImage: 'url(/images/hero/truck.webp)',
        backgroundSize: `${(PHOTO_W / d) * 100}% auto`,
        backgroundPosition: `${((wheel.cx - wheel.r) / (PHOTO_W - d)) * 100}% ${((wheel.cy - wheel.r) / (PHOTO_H - d)) * 100}%`,
        rotate,
      }}
    />
  )
}

export default function LoadingScene({ progress, entry }: SceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const truckRef = useRef<HTMLDivElement>(null)

  // Layout measurements (in px) so the truck starts and ends just off screen
  // and the wheels turn by exactly the distance travelled.
  const sceneWidth = useMotionValue(1200)
  const truckWidth = useMotionValue(900)
  const restLeft = useMotionValue(150)
  useEffect(() => {
    const scene = sceneRef.current
    const truck = truckRef.current
    if (!scene || !truck) return
    const measure = () => {
      sceneWidth.set(scene.offsetWidth)
      truckWidth.set(truck.offsetWidth)
      restLeft.set(truck.offsetLeft)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scene)
    observer.observe(truck)
    return () => observer.disconnect()
  }, [sceneWidth, truckWidth, restLeft])

  const truckX = useTransform([entry, progress, sceneWidth, truckWidth, restLeft], ([e, p, sw, tw, left]: number[]) => {
    const startX = -(left + tw) - 40
    const endX = sw - left + 40
    const exit = clamp01((p - EXIT_START) / (1 - EXIT_START))
    return startX * (1 - easeOutCubic(e)) + endX * easeInQuad(exit)
  })

  const wheelRotate = useTransform([truckX, truckWidth], ([x, tw]: number[]) => {
    const radius = (WHEELS[0].r / PHOTO_W) * tw
    return (x / (2 * Math.PI * radius)) * 360
  })

  // Body pitch: nose dips as it brakes to a stop, squats as it pulls away.
  const pitch = useTransform([entry, progress], ([e, p]: number[]) => {
    const brake = e < 0.6 ? 0 : e < 0.82 ? ((e - 0.6) / 0.22) * 0.9 : 0.9 * (1 - (e - 0.82) / 0.18)
    const exit = clamp01((p - EXIT_START) / 0.08)
    return Math.max(0, brake) - 0.5 * exit
  })

  // A slow camera push-in as the copy clears out of the way. On tablet and
  // desktop it stops before either end of the truck is cropped; on phones it
  // pushes in further, anchored left, so the cargo fills the screen.
  const push = useTransform([progress, sceneWidth, truckWidth], ([p, sw, tw]: number[]) => {
    const target = sw < 640 ? 1.45 : Math.max(1, Math.min(1.32, (sw * 0.96) / tw))
    return 1 + (target - 1) * easeOut(clamp01(p / 0.07))
  })

  // Suspension gives a little each time a part lands.
  const settle = useTransform(progress, (p) =>
    PARTS.reduce((dip, _, index) => {
      const t = (p - landingAt(index)) / 0.035
      return t > 0 && t < 1 ? dip + Math.sin(t * Math.PI) * 2.5 : dip
    }, 0),
  )

  return (
    <div
      ref={sceneRef}
      className="absolute inset-0 overflow-hidden [container-type:size]"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 14%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14%)',
      }}
      aria-hidden="true"
    >
      {/* Ground */}
      <div className="absolute inset-x-0 bottom-0 h-[26%] bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-[4%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <motion.div
        // Phones push in on the cargo (left) rather than the middle
        className="absolute inset-x-0 bottom-[4%] flex origin-bottom-left items-end justify-center sm:origin-bottom"
        style={{ scale: push }}
      >
        <motion.div
          ref={truckRef}
          className="relative w-[min(94cqw,72cqh)] sm:w-[min(80cqw,105cqh)]"
          style={{ x: truckX }}
        >
          {/* Contact shadow stays on the ground while the body pitches */}
          <div
            className="absolute -bottom-[3%] left-[2%] h-[9%] w-[92%]"
            style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65), transparent 70%)' }}
          />

          <motion.div
            className="relative"
            style={{ rotate: pitch, y: settle, transformOrigin: '82% 100%' }}
          >
            <Image
              src="/images/hero/truck.webp"
              alt=""
              width={PHOTO_W}
              height={PHOTO_H}
              priority
              unoptimized
              sizes="(min-width: 1024px) 1000px, 150vw"
              className="relative block h-auto w-full"
            />
            {WHEELS.map((wheel) => (
              <Wheel key={wheel.cx} wheel={wheel} rotate={wheelRotate} />
            ))}
            {PARTS.map((part, index) => (
              <Part key={index} part={part} index={index} progress={progress} />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

/** Real warehouse photo behind everything, drifting slowly for depth. */
export function SceneBackdrop({ progress }: { progress: MotionValue<number> }) {
  const x = useTransform(progress, [0, 1], ['-2.5%', '2.5%'])
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div className="absolute -inset-[6%]" style={{ x }}>
        <Image
          src="/images/spares.webp"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover [filter:blur(2px)_brightness(0.5)_saturate(0.75)]"
        />
      </motion.div>
      {/* Keep the copy readable and blend into the page */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#141820]/95 via-[#141820]/65 to-[#141820]/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#141820]/50 via-transparent to-[#141820]/90" />
    </div>
  )
}

/** Small caption that names what the animation is showing, plus a scroll cue. */
export function LoadingSteps({ progress }: { progress: MotionValue<number> }) {
  const [active, setActive] = useState(0)
  useMotionValueEvent(progress, 'change', (p) => {
    const next = STEPS.reduce((current, step, index) => (p >= step.from ? index : current), 0)
    setActive((previous) => (previous === next ? previous : next))
  })
  const barScale = useTransform(progress, [0, 1], [0, 1])
  const cueOpacity = useTransform(progress, [0, 0.04], [1, 0])

  return (
    <div className="pointer-events-none relative z-20 border-t border-white/10" aria-hidden="true">
      <div className="container mx-auto flex items-center justify-between gap-6 px-4 py-3 sm:py-4">
        <div className="w-full sm:w-auto">
          <ol className="flex gap-6 text-sm whitespace-nowrap">
            {STEPS.map((step, index) => (
              <li
                key={step.label}
                className={`transition-colors duration-300 ${
                  index === active ? 'text-white' : 'hidden text-white/40 sm:block'
                }`}
              >
                <span className="mr-1.5 tabular-nums text-brand">0{index + 1}</span>
                {step.label}
              </li>
            ))}
          </ol>
          <div className="mt-2 h-px w-full bg-white/15">
            <motion.div className="h-full origin-left bg-brand" style={{ scaleX: barScale }} />
          </div>
        </div>
        <motion.div className="hidden items-center gap-2 text-sm text-white/70 sm:flex" style={{ opacity: cueOpacity }}>
          Scroll
          <span className="relative block h-8 w-px overflow-hidden bg-white/20">
            <motion.span
              className="absolute inset-x-0 top-0 h-3 bg-white"
              animate={{ y: [-12, 32] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </motion.div>
      </div>
    </div>
  )
}
