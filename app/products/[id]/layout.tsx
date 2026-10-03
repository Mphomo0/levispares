import type { Metadata } from 'next'
import { categoryPath, productPath } from '@/lib/shopUrl'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, tidyName } from '@/lib/seo'
import { getProductDetails, resolveProduct } from './resolve'
import { SITE_NAME, SITE_URL } from '@/lib/site'

async function getProduct(ref: string) {
  const resolved = await resolveProduct(decodeURIComponent(ref))
  if (!resolved) return null
  const product = await getProductDetails(resolved._id)
  return product ? { ...product, path: productPath(product) } : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: 'Product not found', robots: { index: false } }

  const description =
    (product.description || '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `Buy ${product.name} from ${SITE_NAME}. Nationwide delivery across South Africa.`

  return {
    title: product.name,
    description,
    alternates: { canonical: product.path },
    openGraph: {
      type: 'website',
      title: product.name,
      description,
      url: `${SITE_URL}${product.path}`,
      images: product.image ? [{ url: product.image }] : undefined,
    },
  }
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProduct(id)

  const jsonLd = product && {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: product.image || undefined,
    sku: product.sku,
    mpn: product.partNumber || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}${product.path}`,
      priceCurrency: 'ZAR',
      price: product.price.toFixed(2),
      availability:
        (product.stockQty ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  }

  const breadcrumb =
    product &&
    breadcrumbJsonLd([
      { name: 'Home', href: '/' },
      { name: 'Shop', href: '/shop' },
      ...(product.category ? [{ name: tidyName(product.category.name), href: categoryPath(product.category.slug) }] : []),
      { name: product.name, href: product.path },
    ])

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      {breadcrumb && <JsonLd data={breadcrumb} />}
      {children}
    </>
  )
}
