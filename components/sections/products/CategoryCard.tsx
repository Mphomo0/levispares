'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface CategoryCardProps {
  id: string
  name: string
  icon: string
  description: string
}

export default function CategoryCard({
  id,
  name,
  icon,
  description,
}: CategoryCardProps) {
  return (
    <Link
      href={`/shop?category=${id}`} // This uses Next.js's Link component
      className="category-card group p-6 flex flex-col items-center text-center"
    >
      <span className="text-4xl mb-3">{icon}</span>
      <h3 className="font-semibold text-foreground text-lg mb-1 group-hover:text-accent transition-colors">
        {name}
      </h3>
      <p className="text-muted-foreground text-sm mb-3">{description}</p>
      <span className="flex items-center gap-1 text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Shop Now <ChevronRight className="w-4 h-4" />
      </span>
    </Link>
  )
}
