import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import HomeContent from '@/components/sections/home/HomeContent'

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
