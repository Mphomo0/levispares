'use client'

import { createElement } from 'react'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { categoryPath } from '@/lib/shopUrl'
import { tidyName } from '@/lib/seo'
import { categoryIcon } from './categoryIcon'

interface CategoryCardProps {
  slug: string
  name: string
  description: string
}

export default function CategoryCard({ slug, name, description }: CategoryCardProps) {
  return (
    <Link
      href={categoryPath(slug)}
      className="category-card group p-6 flex flex-col items-center text-center"
    >
      <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 transition-colors group-hover:bg-accent">
        {createElement(categoryIcon(slug, name), {
          className: 'h-7 w-7 text-accent transition-colors group-hover:text-white',
          'aria-hidden': true,
        })}
      </span>
      <h3 className="font-semibold text-foreground text-lg mb-1 group-hover:text-accent transition-colors text-balance">
        {tidyName(name)}
      </h3>
      {description && <p className="text-muted-foreground text-sm mb-3">{description}</p>}
      <span className="mt-auto flex items-center gap-1 text-accent text-sm font-medium">
        Shop now <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </span>
    </Link>
  )
}
