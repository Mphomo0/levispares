'use client'

import { ChevronRight, Wrench } from 'lucide-react'
import Link from 'next/link'

interface CategoryCardProps {
  slug: string
  name: string
  icon: string
  description: string
}

export default function CategoryCard({
  slug,
  name,
  icon,
  description,
}: CategoryCardProps) {
  return (
    <Link
      href={`/shop?category=${encodeURIComponent(slug)}`}
      className="category-card group p-6 flex flex-col items-center text-center"
    >
      {icon ? (
        <span className="text-4xl mb-3" aria-hidden="true">{icon}</span>
      ) : (
        <Wrench className="w-9 h-9 mb-3 text-accent" aria-hidden="true" />
      )}
      <h3 className="font-semibold text-foreground text-lg mb-1 group-hover:text-accent transition-colors">
        {name}
      </h3>
      <p className="text-muted-foreground text-sm mb-3">{description}</p>
      <span className="flex items-center gap-1 text-accent text-sm font-medium ">
        Shop now <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </span>
    </Link>
  )
}
