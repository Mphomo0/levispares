import type { Metadata } from 'next'
import { categoryPath, productPath } from '@/lib/shopUrl'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, returnPolicyJsonLd, shippingJsonLd, tidyName } from '@/lib/seo'
import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
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
  const [product, settings] = await Promise.all([
    getProduct(id),
    fetchQuery(api.settings.get, {}).catch(() => null),
  ])
  const images = product
    ? [product.image, ...product.images.map((image) => image.url)].filter((url, i, all): url is string => Boolean(url) && all.indexOf(url) === i)
    : []

  const jsonLd = product && {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: images.length ? images : undefined,
    sku: product.sku,
    mpn: product.partNumber || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}${product.path}`,
      priceCurrency: 'ZAR',
      price: product.price.toFixed(2),
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        (product.stockQty ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@id': `${SITE_URL}/#store` },
      shippingDetails: shippingJsonLd(settings?.shippingRate ?? 250),
      hasMerchantReturnPolicy: returnPolicyJsonLd(),
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
