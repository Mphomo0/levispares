'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import imagekitLoader from '@/lib/imagekitLoader'

interface BrandCardProps {
  brand: {
    _id: string
    name: string
    slug: string
    logo?: string
    imageKitFileId?: string
    description?: string
  }
}

export default function BrandCard({ brand }: BrandCardProps) {
  return (
    <Link
      href={`/shop?brand=${brand.slug}`}
      className="group relative w-32 sm:w-40 p-4 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="w-20 h-20 relative flex items-center justify-center">
        {brand.logo || brand.imageKitFileId ? (
          <Image
            loader={
              (brand.logo || '').includes('ik.imagekit.io') || !brand.logo
                ? imagekitLoader
                : undefined
            }
            src={brand.logo || `https://ik.imagekit.io/carparts/${brand.imageKitFileId}`}
            alt={brand.name}
            fill
            sizes="80px"
            className="object-contain p-2"
          />
        ) : (
          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-3xl font-bold text-slate-400">
            {brand.name.charAt(0)}
          </div>
        )}
      </div>
      <span className="absolute bottom-2 flex items-center gap-1 text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Shop Now <ChevronRight className="w-4 h-4" />
      </span>
    </Link>
  )
}