import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import ShopContent from '../../ShopContent'
import JsonLd from '@/components/seo/JsonLd'
import { findBrand, loadShop, readFilters } from '@/lib/shopServer'
import { breadcrumbJsonLd, clip, collectionJsonLd, isRefinedView, tidyName, withPage } from '@/lib/seo'
import { brandPath, shopUrl } from '@/lib/shopUrl'
import { SITE_URL } from '@/lib/site'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function describe(name: string, description?: string) {
  return clip(
    description ||
      `Aftermarket ${name} truck spare parts: body panels, lights, mirrors, engine and electrical parts. Order online with nationwide delivery across South Africa.`,
  )
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const found = await findBrand(slug)
  if (!found) return { title: 'Brand not found', robots: { index: false } }
  const brand = { ...found, name: tidyName(found.name) }

  const filters = readFilters(await searchParams)
  const initial = await loadShop({ ...filters, brand: brand.slug })
  const empty = !initial.data?.totalCount
  const path = brandPath(brand.slug)
  const description = describe(brand.name, brand.description)

  return {
    title: filters.page > 1 ? `${brand.name} Truck Spare Parts – Page ${filters.page}` : `${brand.name} Truck Spare Parts`,
    description,
    alternates: { canonical: withPage(path, filters.page) },
    // Refined views, and pages with no parts on them yet, stay out of the index.
    robots: isRefinedView(filters) || empty ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      title: `${brand.name} Truck Spare Parts`,
      description,
      url: `${SITE_URL}${path}`,
      images: brand.logo ? [{ url: brand.logo }] : undefined,
    },
  }
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params
  const found = await findBrand(slug)
  if (!found) notFound()
  const brand = { ...found, name: tidyName(found.name) }

  const query = readFilters(await searchParams)
  const filters = { ...query, brand: brand.slug }
  // Combined with a category or a search, this is a /shop view, not this page.
  if (query.category || query.q || query.brand) permanentRedirect(shopUrl(filters))

  const [initial, models] = await Promise.all([loadShop(filters), fetchQuery(api.models.listActive, { brandId: brand._id })])
  // Past the last page of results is not a real page.
  if (filters.page > 1 && !initial.data?.products.length) notFound()

  const breadcrumb = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    { name: brand.name, href: brandPath(brand.slug) },
  ]
  const description = describe(brand.name, brand.description)

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumb)} />
      <JsonLd data={collectionJsonLd(`${brand.name} truck spare parts`, brandPath(brand.slug), description, initial)} />
      <Suspense>
        <ShopContent
          heading={`${brand.name} truck spare parts`}
          intro={
            brand.description ||
            `Aftermarket spare parts for ${brand.name} trucks. Choose your model below, or call 012 770 3389 and we'll help you find the right part.`
          }
          breadcrumb={breadcrumb}
          related={
            models.length
              ? { label: `${brand.name} models`, links: models.map((m) => ({ name: m.name, href: shopUrl({ brand: brand.slug, model: m.slug }) })) }
              : undefined
          }
          initial={initial}
        />
      </Suspense>
    </>
  )
}
