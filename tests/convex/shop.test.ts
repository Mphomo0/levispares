import { describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import { setup, type T } from './helpers'

/** Electrical > Indicators > LED, plus an unrelated Brakes category and an inactive subcategory. */
async function seedCategories(t: T) {
  return t.run(async (ctx) => {
    const brandId = await ctx.db.insert('brands', { name: 'Isuzu', slug: 'isuzu', active: true })
    const otherBrandId = await ctx.db.insert('brands', { name: 'Hino', slug: 'hino', active: true })
    const electrical = await ctx.db.insert('categories', { name: 'Electrical', slug: 'electrical', active: true })
    const indicators = await ctx.db.insert('categories', { name: 'Indicators', slug: 'indicators', parentId: electrical, active: true })
    const led = await ctx.db.insert('categories', { name: 'LED', slug: 'led', parentId: indicators, active: true })
    const hidden = await ctx.db.insert('categories', { name: 'Hidden', slug: 'hidden', parentId: electrical, active: false })
    const brakes = await ctx.db.insert('categories', { name: 'Brakes', slug: 'brakes', active: true })
    const product = (name: string, categoryId: typeof electrical, brand = brandId) =>
      ctx.db.insert('products', { brandId: brand, categoryId, sku: name, name, price: 100, stockQty: 1, active: true })
    await product('Alternator', electrical)
    await product('Indicator lens', indicators)
    await product('LED indicator', led, otherBrandId)
    await product('Hidden part', hidden)
    await product('Brake pad', brakes)
    return { brandId, electrical, indicators, led, brakes }
  })
}

const names = (result: { products: { name: string; category?: string }[] }) =>
  result.products.map((p) => p.name).sort()

describe('products.listShopNumbered: subcategories', () => {
  it('includes products from every active subcategory when a parent is chosen', async () => {
    const t = setup()
    const s = await seedCategories(t)
    const result = await t.query(api.products.listShopNumbered, { page: 1, pageSize: 20, categoryId: s.electrical })
    expect(names(result)).toEqual(['Alternator', 'Indicator lens', 'LED indicator'])
  })

  it('narrows to just the subcategory (and its children) when a subcategory is chosen', async () => {
    const t = setup()
    const s = await seedCategories(t)
    const result = await t.query(api.products.listShopNumbered, { page: 1, pageSize: 20, categoryId: s.indicators })
    expect(names(result)).toEqual(['Indicator lens', 'LED indicator'])
  })

  it('still combines a parent category with a brand filter', async () => {
    const t = setup()
    const s = await seedCategories(t)
    const result = await t.query(api.products.listShopNumbered, {
      page: 1, pageSize: 20, categoryId: s.electrical, brandId: s.brandId,
    })
    expect(names(result)).toEqual(['Alternator', 'Indicator lens'])
  })

  it('labels each product with its own category name', async () => {
    const t = setup()
    const s = await seedCategories(t)
    const result = await t.query(api.products.listShopNumbered, { page: 1, pageSize: 20, categoryId: s.electrical })
    const byName = Object.fromEntries(result.products.map((p) => [p.name, p.category]))
    expect(byName).toEqual({ Alternator: 'Electrical', 'Indicator lens': 'Indicators', 'LED indicator': 'LED' })
  })
})
