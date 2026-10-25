import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import { lowStockEmail } from '../../convex/adminTools'
import { asAdmin, asUser, seed, setup } from './helpers'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete process.env.RESEND_API_KEY
  delete process.env.EMAIL_FROM
  delete process.env.ORDER_NOTIFY_EMAIL
})

describe('product spreadsheet', () => {
  it('exports every product with brand and category by slug', async () => {
    const t = setup()
    await seed(t)
    const rows = await asAdmin(t).query(api.adminTools.exportProducts, {})
    expect(rows[0]).toMatchObject({ sku: 'SKU-1', name: 'Brake pad', price: 100, stockQty: 10, active: 'yes', brand: 'isuzu', category: 'brakes' })
    expect(await asUser(t, 'user_a').query(api.adminTools.exportProducts, {})).toEqual([])
  })

  it('checks first without saving, then updates by SKU and adds new products', async () => {
    const t = setup()
    const s = await seed(t)
    const rows = [
      { sku: 'SKU-1', price: 'R 120.50', stockQty: '3' },
      { sku: 'SKU-2', name: 'Oil filter' }, // nothing changes
      { sku: 'NEW-1', name: 'Fan belt', price: '80', brand: 'Isuzu', category: 'brakes' },
      { sku: 'NEW-2', name: 'No price', brand: 'isuzu', category: 'brakes' },
      { sku: 'SKU-1', price: '1' },
    ]
    const check = await asAdmin(t).mutation(api.adminTools.importProducts, { rows, dryRun: true })
    expect(check).toMatchObject({ created: 1, updated: 1, unchanged: 1 })
    expect(check.errors).toEqual([
      { row: 5, sku: 'NEW-2', message: 'A new product needs a name, price, brand and category' },
      { row: 6, sku: 'SKU-1', message: 'This SKU appears more than once in the file' },
    ])
    expect((await t.run((ctx) => ctx.db.get(s.p1)))?.price).toBe(100)

    await asAdmin(t).mutation(api.adminTools.importProducts, { rows, dryRun: false })
    expect(await t.run((ctx) => ctx.db.get(s.p1))).toMatchObject({ price: 120.5, stockQty: 3 })
    const added = await t.run((ctx) => ctx.db.query('products').withIndex('by_sku', (q) => q.eq('sku', 'NEW-1')).first())
    expect(added).toMatchObject({ name: 'Fan belt', price: 80, brandId: s.brandId, stockQty: 0, active: true, slug: 'fan-belt' })
  })

  it('explains bad values and unknown brands', async () => {
    const t = setup()
    await seed(t)
    const result = await asAdmin(t).mutation(api.adminTools.importProducts, {
      rows: [{ sku: 'SKU-1', price: 'cheap' }, { sku: 'SKU-2', brand: 'volvo' }, { sku: 'SKU-1x', stockQty: '2.5' }],
      dryRun: true,
    })
    expect(result.errors.map((e) => e.message)).toEqual([
      'Price "cheap" is not a valid amount',
      'No brand "volvo"',
      'Stock "2.5" must be a whole number',
    ])
    await expect(asUser(t, 'user_a').mutation(api.adminTools.importProducts, { rows: [], dryRun: true }))
      .rejects.toThrow('Admin access required')
  })
})

describe('sales report', () => {
  it('totals paid orders in the period, with VAT, discounts and products', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 2 }, { productId: s.p2, quantity: 1 }],
    })
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })
    await asUser(t, 'user_b').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] }) // unpaid

    const now = Date.now()
    const report = await asAdmin(t).query(api.adminTools.salesReport, { from: now - 60_000, to: now + 60_000 })
    expect(report).toMatchObject({ orderCount: 1, subtotal: 249.99, tax: 37.5, total: 537.49, refunded: 0, net: 537.49 })
    expect(report?.products).toEqual([
      { name: 'Brake pad', sku: 'SKU-1', quantity: 2, revenue: 200 },
      { name: 'Oil filter', sku: 'SKU-2', quantity: 1, revenue: 49.99 },
    ])
    expect(report?.categories).toEqual([{ name: 'Brakes', quantity: 3, revenue: 249.99 }])
    expect(report?.orders[0]).toMatchObject({ invoiceNumber: 'INV-00001', total: 537.49 })

    expect((await asAdmin(t).query(api.adminTools.salesReport, { from: now + 60_000, to: now + 120_000 }))?.orderCount).toBe(0)
    expect(await asUser(t, 'user_a').query(api.adminTools.salesReport, { from: 0, to: now })).toBeNull()
  })
})

describe('low stock', () => {
  it('lists active products with 5 or fewer, out of stock first, with customers waiting', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(s.p1, { stockQty: 0 })
      await ctx.db.patch(s.p2, { stockQty: 4 })
    })
    await t.mutation(api.stockAlerts.subscribe, { productId: s.p1, email: 'a@example.com' })
    const rows = await asAdmin(t).query(api.adminTools.lowStockList, {})
    expect(rows.map((r) => [r.sku, r.stockQty, r.waiting])).toEqual([['SKU-1', 0, 1], ['SKU-2', 4, 0]])
    expect(lowStockEmail(rows).subject).toBe('Stock report: 1 out of stock, 1 running low')
  })

  it('emails the report to the shop, and nothing when stock is fine', async () => {
    const t = setup()
    const s = await seed(t)
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Shop <orders@example.com>'
    process.env.ORDER_NOTIFY_EMAIL = 'info@example.com'
    const fetchMock = vi.fn(async () => new Response('{"id":"1"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await t.run((ctx) => ctx.db.patch(s.p2, { stockQty: 20 }))
    expect(await t.action(internal.adminTools.sendLowStockReport, {})).toEqual({ sent: false })
    await t.run((ctx) => ctx.db.patch(s.p2, { stockQty: 2 }))
    expect(await t.action(internal.adminTools.sendLowStockReport, {})).toEqual({ sent: true })
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body).toMatchObject({ to: ['info@example.com'], subject: 'Stock report: 0 out of stock, 1 running low' })
  })
})
