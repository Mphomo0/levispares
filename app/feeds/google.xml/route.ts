import { fetchQuery } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import { productPath } from '@/lib/shopUrl'

// Google fetches the feed on its own schedule; an hour is fresh enough.
export const revalidate = 3600

// "Vehicles & Parts > Vehicle Parts & Accessories > Motor Vehicle Parts" in Google's product taxonomy.
const GOOGLE_CATEGORY = '899'

const xml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

// Google needs South African prices to include VAT.
const zar = (amount: number, taxRate: number) => `${(Math.round(amount * (1 + taxRate / 100) * 100) / 100).toFixed(2)} ZAR`

/**
 * Product feed for Google Merchant Center (Google Shopping), at
 * /feeds/google.xml. Add it in Merchant Center as a scheduled fetch.
 */
export async function GET() {
  const feed = await fetchQuery(api.products.shoppingFeed, {})

  const items = feed.items
    .filter((item) => item.images.length > 0) // Google rejects products without an image.
    .map((item) => {
      const onSale = item.originalPrice !== undefined && item.originalPrice > item.price
      const tags = [
        ['g:id', item.sku],
        ['g:title', item.name.slice(0, 150)],
        ['g:description', (item.description?.trim() || `${item.name} from ${item.brand}`).slice(0, 5000)],
        ['g:link', `${SITE_URL}${productPath({ _id: item.id, slug: item.slug })}`],
        ['g:image_link', item.images[0]],
        ...item.images.slice(1, 11).map((url) => ['g:additional_image_link', url]),
        ['g:availability', item.inStock ? 'in_stock' : 'out_of_stock'],
        ['g:price', zar(onSale ? item.originalPrice! : item.price, feed.taxRate)],
        ...(onSale ? [['g:sale_price', zar(item.price, feed.taxRate)]] : []),
        ['g:condition', 'new'],
        ['g:brand', item.brand],
        ...(item.partNumber ? [['g:mpn', item.partNumber]] : [['g:identifier_exists', 'no']]),
        ['g:google_product_category', GOOGLE_CATEGORY],
        ['g:product_type', item.category],
      ]
      const shipping = `<g:shipping><g:country>ZA</g:country><g:price>${(feed.shippingRate).toFixed(2)} ZAR</g:price></g:shipping>`
      return `    <item>\n${tags.map(([tag, value]) => `      <${tag}>${xml(String(value))}</${tag}>`).join('\n')}\n      ${shipping}\n    </item>`
    })

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${xml(`${SITE_NAME} truck spare parts`)}</description>
${items.join('\n')}
  </channel>
</rss>
`
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
