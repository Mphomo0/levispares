import { describe, expect, it, vi } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { asAdmin, asUser, seed, setup, type T } from './helpers'

const secret = { serverSecret: 'test-secret' }
const stock = async (t: T, id: Id<'products'>) => (await t.run((ctx) => ctx.db.get(id)))!.stockQty

describe('holding stock while a customer pays', () => {
  it('holds the parts when payment starts, so a second customer cannot pay for the same last ones', async () => {
    const t = setup()
    const s = await seed(t)
    const a = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 5 }] })
    const b = await asUser(t, 'user_b').mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 1 }] })

    await t.mutation(api.orders.attachPayment, { id: a.orderId, ...secret })
    expect(await stock(t, s.p2)).toBe(0)
    await expect(t.mutation(api.orders.attachPayment, { id: b.orderId, ...secret })).rejects.toThrow(/sold out/)

    // Paying does not take the stock a second time.
    await t.mutation(api.orders.markPaid, { id: a.orderId, paymentReference: 'OZ-1', ...secret })
    expect(await stock(t, s.p2)).toBe(0)
    expect((await t.run((ctx) => ctx.db.get(a.orderId)))!.adminAlert).toBeUndefined()
  })

  it('puts the parts back when the payment is cancelled, and holds them again on a retry', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 3 }] })
    await t.mutation(api.orders.attachPayment, { id: orderId, ...secret })
    expect(await stock(t, s.p1)).toBe(7)
    await t.mutation(api.orders.releasePayment, { id: orderId, ...secret })
    await t.mutation(api.orders.releasePayment, { id: orderId, ...secret })
    expect(await stock(t, s.p1)).toBe(10)
    await t.mutation(api.orders.attachPayment, { id: orderId, ...secret })
    await t.mutation(api.orders.attachPayment, { id: orderId, ...secret })
    expect(await stock(t, s.p1)).toBe(7)
  })

  it('still takes a late payment after the hold lapsed, and tells staff when stock is short', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 5 }] })
    await t.mutation(api.orders.attachPayment, { id: orderId, ...secret })
    await t.mutation(api.orders.releasePayment, { id: orderId, ...secret })
    await t.run((ctx) => ctx.db.patch(s.p2, { stockQty: 2 }))

    await t.mutation(api.orders.markPaid, { id: orderId, paymentReference: 'OZ-1', ...secret })
    const order = (await t.run((ctx) => ctx.db.get(orderId)))!
    expect(order.status).toBe('paid')
    expect(order.adminAlert).toMatch(/Oil filter \(short by 3\)/)
    // Staff notes never reach the customer.
    expect(await asUser(t, 'user_a').query(api.orders.getById, { id: orderId })).not.toHaveProperty('adminAlert')
    const [mine] = await asUser(t, 'user_a').query(api.orders.listByUser, {})
    expect(mine).not.toHaveProperty('adminAlert')

    await expect(asUser(t, 'user_a').mutation(api.orders.clearAlert, { id: orderId })).rejects.toThrow(/Admin access required/)
    await asAdmin(t).mutation(api.orders.clearAlert, { id: orderId })
    expect((await t.run((ctx) => ctx.db.get(orderId)))!.adminAlert).toBeUndefined()
  })

  it('only the server can hold, release or flag', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    const bad = { serverSecret: 'wrong' }
    await expect(asUser(t, 'user_a').mutation(api.orders.attachPayment, { id: orderId, ...bad })).rejects.toThrow(/Not authorized/)
    await expect(asUser(t, 'user_a').mutation(api.orders.releasePayment, { id: orderId, ...bad })).rejects.toThrow(/Not authorized/)
    await expect(asUser(t, 'user_a').mutation(api.orders.flagPayment, { id: orderId, note: 'x', ...bad })).rejects.toThrow(/Not authorized/)
    await expect(asUser(t, 'user_a').query(api.orders.getForPayment, { id: orderId, ...bad })).rejects.toThrow(/Not authorized/)
  })
})

describe('cleaning up unpaid orders', () => {
  it('drops stale holds, clears old checkouts and leaves everything else', async () => {
    vi.useFakeTimers()
    try {
      const t = setup()
      const s = await seed(t)
      const HOUR = 60 * 60 * 1000
      const neverStarted = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
      const started = await asUser(t, 'user_b').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 2 }] })
      await t.mutation(api.orders.attachPayment, { id: started.orderId, ...secret })
      const paid = await t.mutation(api.orders.createGuest, {
        items: [{ productId: s.p2, quantity: 1 }], email: 'g@example.com',
        address: { name: 'G', street: '1 Road', city: 'Pretoria', postalCode: '0001', country: 'South Africa' },
      })
      await t.mutation(api.orders.attachPayment, { id: paid.orderId, ...secret })
      await t.mutation(api.orders.markPaid, { id: paid.orderId, paymentReference: 'OZ-1', ...secret })
      expect(await stock(t, s.p1)).toBe(8)

      // One hour on: nothing is old enough yet.
      vi.advanceTimersByTime(HOUR)
      expect(await t.mutation(internal.orders.cleanUpUnpaid, {})).toEqual({ released: 0, deleted: 0 })

      // Three hours on: the hold is dropped but both orders remain.
      vi.advanceTimersByTime(2 * HOUR)
      expect(await t.mutation(internal.orders.cleanUpUnpaid, {})).toEqual({ released: 1, deleted: 0 })
      expect(await stock(t, s.p1)).toBe(10)

      // A day on: the checkout that never reached payment goes.
      vi.advanceTimersByTime(24 * HOUR)
      expect(await t.mutation(internal.orders.cleanUpUnpaid, {})).toEqual({ released: 0, deleted: 1 })
      expect(await t.run((ctx) => ctx.db.get(neverStarted.orderId))).toBeNull()
      expect(await t.run((ctx) => ctx.db.get(started.orderId))).not.toBeNull()

      // Eight days on: the abandoned payment attempt goes too; the paid order stays.
      vi.advanceTimersByTime(8 * 24 * HOUR)
      expect(await t.mutation(internal.orders.cleanUpUnpaid, {})).toEqual({ released: 0, deleted: 1 })
      expect(await t.run((ctx) => ctx.db.get(paid.orderId))).not.toBeNull()
      expect(await t.run((ctx) => ctx.db.query('orderItems').collect())).toHaveLength(1)
      expect(await stock(t, s.p1)).toBe(10)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('delivery tracking', () => {
  it('saves the courier details when an order is marked shipped, and lets staff correct them', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    await t.mutation(api.orders.markPaid, { id: orderId, paymentReference: 'OZ-1', ...secret })
    await asAdmin(t).mutation(api.orders.updateStatus, { id: orderId, status: 'shipped', courier: ' The Courier Guy ', trackingNumber: 'TCG123' })
    expect(await asUser(t, 'user_a').query(api.orders.getById, { id: orderId })).toMatchObject({ courier: 'The Courier Guy', trackingNumber: 'TCG123' })

    await expect(asUser(t, 'user_a').mutation(api.orders.setTracking, { id: orderId, trackingNumber: 'X' })).rejects.toThrow(/Admin access required/)
    await asAdmin(t).mutation(api.orders.setTracking, { id: orderId, courier: 'Aramex', trackingNumber: 'AR9' })
    expect(await t.run((ctx) => ctx.db.get(orderId))).toMatchObject({ courier: 'Aramex', trackingNumber: 'AR9' })
  })
})

describe('limits on public sign-ups', () => {
  it('stops one address signing up for endless back-in-stock alerts', async () => {
    const t = setup()
    const s = await seed(t)
    const ids = await t.run(async (ctx) => {
      const made = []
      for (let i = 0; i < 11; i++) {
        made.push(await ctx.db.insert('products', { brandId: s.brandId, categoryId: s.categoryId, sku: `OUT-${i}`, name: `Part ${i}`, price: 10, stockQty: 0, active: true }))
      }
      return made
    })
    for (const productId of ids.slice(0, 10)) await t.mutation(api.stockAlerts.subscribe, { productId, email: 'x@example.com' })
    await expect(t.mutation(api.stockAlerts.subscribe, { productId: ids[10], email: 'x@example.com' })).rejects.toThrow(/Too many alerts/)
    // Someone else is not affected.
    await t.mutation(api.stockAlerts.subscribe, { productId: ids[10], email: 'y@example.com' })
  })

  it('only staff can list every product, including hidden ones', async () => {
    const t = setup()
    await seed(t)
    expect(await t.query(api.products.listAdmin, {})).toEqual([])
    expect(await asUser(t, 'user_a').query(api.products.listAdmin, {})).toEqual([])
    expect(await asAdmin(t).query(api.products.listAdmin, {})).toHaveLength(2)
  })
})
