// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const fetchQuery = vi.fn()
vi.mock('convex/nextjs', () => ({ fetchQuery: (...args: unknown[]) => fetchQuery(...args) }))

const route = await import('@/app/feeds/google.xml/route')

const ITEM = {
  id: 'p1', sku: 'SKU-1', slug: 'brake-pad', name: 'Brake pad & shoe', description: undefined, partNumber: '8-97',
  price: 100, originalPrice: 120, inStock: true, brand: 'Isuzu', category: 'Brakes',
  images: ['https://img.example/a.webp', 'https://img.example/b.webp'],
}

describe('Google Shopping feed', () => {
  it('lists products with VAT-inclusive prices, sale price, availability and links', async () => {
    fetchQuery.mockResolvedValue({
      taxRate: 15, shippingRate: 250,
      items: [ITEM, { ...ITEM, id: 'p2', sku: 'SKU-2', partNumber: undefined, originalPrice: undefined, inStock: false, images: [] }],
    })
    const res = await route.GET()
    expect(res.headers.get('Content-Type')).toContain('application/xml')
    const body = await res.text()
    expect(body).toContain('<g:id>SKU-1</g:id>')
    expect(body).toContain('<g:title>Brake pad &amp; shoe</g:title>')
    expect(body).toContain('<g:link>https://www.levispares.co.za/products/brake-pad</g:link>')
    expect(body).toContain('<g:price>138.00 ZAR</g:price>')
    expect(body).toContain('<g:sale_price>115.00 ZAR</g:sale_price>')
    expect(body).toContain('<g:additional_image_link>https://img.example/b.webp</g:additional_image_link>')
    expect(body).toContain('<g:availability>in_stock</g:availability>')
    expect(body).toContain('<g:mpn>8-97</g:mpn>')
    expect(body).toContain('<g:price>250.00 ZAR</g:price></g:shipping>')
    expect(body).not.toContain('SKU-2') // no image, so left out
  })

  it('uses the shop price as is when VAT is off', async () => {
    fetchQuery.mockResolvedValue({ taxRate: 0, shippingRate: 250, items: [{ ...ITEM, originalPrice: undefined, partNumber: undefined }] })
    const body = await (await route.GET()).text()
    expect(body).toContain('<g:price>100.00 ZAR</g:price>')
    expect(body).toContain('<g:identifier_exists>no</g:identifier_exists>')
  })
})
