import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import ShopContent from './ShopContent'
import JsonLd from '@/components/seo/JsonLd'
import { findBrand, findCategory, getCategories, loadShop, readFilters } from '@/lib/shopServer'
import { BRAND_LIST, breadcrumbJsonLd, collectionJsonLd, isRefinedView, tidyName, withPage } from '@/lib/seo'
import { categoryPath, shopUrl } from '@/lib/shopUrl'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const DESCRIPTION = `Browse aftermarket truck spare parts for ${BRAND_LIST} and more, by brand, model and category. Order online with nationwide delivery across South Africa.`

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = readFilters(await searchParams)
  // A category and a brand together is a filtered view of the category page.
  const combined = !!(filters.category && filters.brand)
  const canonical = combined ? categoryPath(filters.category) : withPage('/shop', filters.page)

  return {
    title: filters.q ? `Search results for “${filters.q}”` : 'Shop Truck Spare Parts',
    description: DESCRIPTION,
    alternates: { canonical },
    robots: combined || isRefinedView(filters) ? { index: false, follow: true } : undefined,
  }
}

export default async function ShopPage({ searchParams }: Props) {
  const filters = readFilters(await searchParams)

  // A single category or brand has its own page; send old links there.
  const target = shopUrl(filters)
  if (!target.startsWith('/shop?') && target !== '/shop') permanentRedirect(target)

  const [initial, categories, category, brand] = await Promise.all([
    loadShop(filters),
    getCategories(),
    findCategory(filters.category),
    findBrand(filters.brand),
  ])
  if (filters.page > 1 && !initial.data?.products.length) notFound()
  const heading = filters.q
    ? `Results for “${filters.q}”`
    : category && brand
      ? `${tidyName(category.name)} for ${tidyName(brand.name)}`
      : 'Truck spare parts'
  const topLevel = categories.filter((c) => !c.parentId && c.active !== false)
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
  ]

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumb)} />
      {!filters.q && <JsonLd data={collectionJsonLd('Truck spare parts', '/shop', DESCRIPTION, initial)} />}
      <Suspense>
        <ShopContent
          heading={heading}
          intro={`Aftermarket parts for ${BRAND_LIST} and more, from body panels and lights to engine and electrical components.`}
          breadcrumb={breadcrumb}
          related={{
            label: 'Shop by category',
            links: topLevel.map((c) => ({ name: tidyName(c.name), href: categoryPath(c.slug) })),
          }}
          initial={initial}
        />
      </Suspense>
    </>
  )
}
