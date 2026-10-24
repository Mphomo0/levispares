import type { Metadata } from 'next'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import HomeContent from '@/components/sections/home/HomeContent'
import { SITE_LOGO, SITE_NAME, SITE_URL } from '@/lib/site'

const TITLE = `Truck Spares & Parts in Pretoria | ${SITE_NAME}`
const DESCRIPTION =
  'Truck spares for Isuzu, Hino, Fuso, UD, FAW and Mercedes-Benz from our Montana, Pretoria store. Shop online with nationwide delivery across South Africa.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_ZA',
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: SITE_LOGO }],
  },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION, images: [SITE_LOGO] },
}

// Rebuilt in the background at most every 5 minutes; the client keeps it live.
export const revalidate = 300

async function load<T>(promise: Promise<T>): Promise<T | undefined> {
  try {
    return await promise
  } catch (error) {
    console.error('Home: failed to load', error)
    return undefined
  }
}

export default async function Home() {
  // ConvexHttpClient (not fetchQuery) so the page can still be statically
  // generated and revalidated rather than rendered on every request.
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
  const [initialFeatured, initialBrands, initialCategories] = await Promise.all([
    load(convex.query(api.products.listFeatured, {})),
    load(convex.query(api.brands.list, {})),
    load(convex.query(api.categories.listTopLevel, {})),
  ])

  return (
    <HomeContent
      initialFeatured={initialFeatured}
      initialBrands={initialBrands}
      initialCategories={initialCategories}
    />
  )
}
