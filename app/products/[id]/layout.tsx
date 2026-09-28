import type { Metadata } from 'next'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { SITE_NAME, SITE_URL } from '@/lib/site'

async function getProduct(id: string) {
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    return await convex.query(api.products.getWithFullHierarchy, { id: id as Id<'products'> })
  } catch {
    return null
  }
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
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      type: 'website',
      title: product.name,
      description,
      url: `${SITE_URL}/products/${id}`,
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
      url: `${SITE_URL}/products/${id}`,
      priceCurrency: 'ZAR',
      price: product.price.toFixed(2),
      availability:
        (product.stockQty ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      {children}
    </>
  )
}
