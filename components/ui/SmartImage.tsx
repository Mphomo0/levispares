'use client'

import Image, { ImageProps } from 'next/image'
import imagekitLoader from '@/lib/imagekitLoader'

type SmartImageProps = Omit<ImageProps, 'loader'>

// Routes ImageKit URLs through the ImageKit transformation loader (avoids
// Vercel Image Optimization billing) and falls back to the default Vercel
// loader for everything else (Unsplash, Clerk, placeholders, etc.)
export default function SmartImage({ src, ...props }: SmartImageProps) {
  const isImageKit = typeof src === 'string' && src.includes('ik.imagekit.io')
  return <Image src={src} loader={isImageKit ? imagekitLoader : undefined} {...props} />
}
