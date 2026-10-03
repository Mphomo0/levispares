import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import ShopContent from '../../ShopContent'
import JsonLd from '@/components/seo/JsonLd'
import { categoryTrail, childCategories, findCategory, loadShop, readFilters } from '@/lib/shopServer'
import { BRAND_LIST, breadcrumbJsonLd, clip, collectionJsonLd, isRefinedView, tidyName, withPage } from '@/lib/seo'
import { categoryPath, shopUrl } from '@/lib/shopUrl'
import { SITE_URL } from '@/lib/site'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function describe(name: string, description?: string) {
  return clip(
    description ||
      `Shop aftermarket ${name.toLowerCase()} for ${BRAND_LIST} trucks and more. Order online with nationwide delivery across South Africa.`,
  )
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await findCategory(slug)
  if (!category) return { title: 'Category not found', robots: { index: false } }

  const filters = readFilters(await searchParams)
  const name = tidyName(category.name)
  const path = categoryPath(category.slug)
  const description = describe(name, category.description)

  return {
    title: filters.page > 1 ? `${name} Truck Parts – Page ${filters.page}` : `${name} Truck Parts`,
    description,
    alternates: { canonical: withPage(path, filters.page) },
    robots: isRefinedView(filters) ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      title: `${name} Truck Parts`,
      description,
      url: `${SITE_URL}${path}`,
      images: category.image ? [{ url: category.image }] : undefined,
    },
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const category = await findCategory(slug)
  if (!category) notFound()

  const query = readFilters(await searchParams)
  const filters = { ...query, category: category.slug }
  // Combined with a brand or a search, this is a /shop view, not this page.
  if (query.brand || query.q || query.category) permanentRedirect(shopUrl(filters))

  const [initial, trail, children] = await Promise.all([loadShop(filters), categoryTrail(category), childCategories(category)])
  // Past the last page of results is not a real page.
  if (filters.page > 1 && !initial.data?.products.length) notFound()

  const name = tidyName(category.name)
  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    ...trail.map((c) => ({ name: tidyName(c.name), href: categoryPath(c.slug) })),
  ]
  const description = describe(name, category.description)

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumb)} />
      <JsonLd data={collectionJsonLd(`${name} truck parts`, categoryPath(category.slug), description, initial)} />
      <Suspense>
        <ShopContent
          heading={name}
          intro={
            category.description ||
            `Aftermarket ${name.toLowerCase()} for ${BRAND_LIST} and more. Need help finding the right part? Call 012 770 3389.`
          }
          breadcrumb={breadcrumb}
          related={
            children.length
              ? { label: `Types of ${name.toLowerCase()}`, links: children.map((c) => ({ name: tidyName(c.name), href: categoryPath(c.slug) })) }
              : undefined
          }
          initial={initial}
        />
      </Suspense>
    </>
  )
}
