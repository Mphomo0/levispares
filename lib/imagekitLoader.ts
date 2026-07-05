'use client'

// Serves next/image requests directly from ImageKit's CDN transformations,
// bypassing Vercel Image Optimization (which is billed per transformation).
export default function imagekitLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  const url = new URL(src)
  url.searchParams.set('tr', `w-${width},q-${quality || 75},f-auto`)
  return url.toString()
}
