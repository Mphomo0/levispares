import { describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import { seed, setup } from './helpers'

const search = (t: ReturnType<typeof setup>, searchQuery: string, extra: Record<string, unknown> = {}) =>
  t.query(api.products.listShopNumbered, { page: 1, pageSize: 12, searchQuery, ...extra })

describe('shop search by part number or SKU', () => {
  it('finds a product by its part number or SKU, ignoring case, spaces and dashes', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(s.p2, { partNumber: '8-97309-927-0' })
      await ctx.db.patch(s.p1, { partNumber: 'B8FU3910lL' })
    })

    expect((await search(t, '8-97309-927-0')).products.map((p) => p.name)).toEqual(['Oil filter'])
    expect((await search(t, '8973099270')).products.map((p) => p.name)).toEqual(['Oil filter'])
    expect((await search(t, 'b8fu3910ll')).products.map((p) => p.name)).toEqual(['Brake pad'])
    expect((await search(t, 'sku 1')).products.map((p) => p.name)).toEqual(['Brake pad'])
  })

  it('still respects the other filters and hides inactive products', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run((ctx) => ctx.db.patch(s.p1, { active: false }))
    expect((await search(t, 'SKU-1')).products).toEqual([])
    expect((await search(t, 'SKU-2', { maxPrice: 10 })).products).toEqual([])
    expect((await search(t, 'SKU-2', { maxPrice: 100 })).products.map((p) => p.name)).toEqual(['Oil filter'])
  })
})
