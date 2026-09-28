import { describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import { asAdmin, asUser, seed, setup } from './helpers'

describe('orders.create: the server prices the order', () => {
  it('works out subtotal, shipping, tax and total from the database', async () => {
    const t = setup()
    const s = await seed(t)
    const result = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 2 }, { productId: s.p2, quantity: 1 }],
      shippingAddressId: s.addrA,
    })
    expect(result.subtotal).toBeCloseTo(249.99, 2)
    expect(result.shipping).toBe(250)
    expect(result.tax).toBeCloseTo(37.5, 2)
    expect(result.total).toBeCloseTo(537.49, 2)
    expect(result.exchangeRate).toBe(18)
    expect(result.items).toEqual([
      { name: 'Brake pad', price: 100, quantity: 2 },
      { name: 'Oil filter', price: 49.99, quantity: 1 },
    ])
  })

  it('charges no tax when tax is switched off', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run(async (ctx) => {
      const settings = await ctx.db.query('storeSettings').first()
      await ctx.db.patch(settings!._id, { taxEnabled: false })
    })
    const result = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 1 }],
    })
    expect(result.tax).toBe(0)
    expect(result.total).toBe(350)
  })

  it('uses the default shipping rate when no settings exist', async () => {
    const t = setup()
    const s = await seed(t, { settings: false })
    const result = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 1 }],
    })
    expect(result.shipping).toBe(250)
    expect(result.exchangeRate).toBeUndefined()
  })

  it('rejects bad quantities, empty carts, unknown stock and inactive products', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    await expect(a.mutation(api.orders.create, { items: [] })).rejects.toThrow(/empty/i)
    for (const quantity of [0, -1, 1.5, 1000]) {
      await expect(
        a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity }] }),
      ).rejects.toThrow(/Invalid quantity/)
    }
    await expect(
      a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 11 }] }),
    ).rejects.toThrow(/Insufficient stock/)
    // the same product on two lines is checked against the combined quantity
    await expect(
      a.mutation(api.orders.create, {
        items: [{ productId: s.p1, quantity: 6 }, { productId: s.p1, quantity: 6 }],
      }),
    ).rejects.toThrow(/Insufficient stock/)
    await t.run((ctx) => ctx.db.patch(s.p2, { active: false }))
    await expect(
      a.mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 1 }] }),
    ).rejects.toThrow(/no longer available/)
  })

  it('needs a signed-in customer and an address that is theirs', async () => {
    const t = setup()
    const s = await seed(t)
    await expect(
      t.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] }),
    ).rejects.toThrow(/Not authenticated/)
    await expect(
      asUser(t, 'user_a').mutation(api.orders.create, {
        items: [{ productId: s.p1, quantity: 1 }],
        shippingAddressId: s.addrB,
      }),
    ).rejects.toThrow(/Invalid address/)
  })

  it('keeps a snapshot of the delivery address on the order', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    const { orderId } = await a.mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 1 }],
      shippingAddressId: s.addrA,
    })
    await t.run((ctx) => ctx.db.delete(s.addrA)) // the customer deletes it later
    const detail = await asAdmin(t).query(api.orders.getAdminDetail, { id: orderId })
    expect(detail?.shippingAddress).toMatchObject({ name: 'Alice', street: '1 Main Road', city: 'Pretoria' })
    expect(detail?.customer).toEqual({ name: 'Alice', email: 'a@example.com' })
  })
})

describe('orders.create: one open checkout per customer', () => {
  it('reuses the unpaid order and replaces its items', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    const first = await a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    const second = await a.mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 2 }] })
    expect(second.orderId).toBe(first.orderId)

    const counts = await t.run(async (ctx) => ({
      orders: (await ctx.db.query('orders').collect()).length,
      items: await ctx.db.query('orderItems').collect(),
    }))
    expect(counts.orders).toBe(1)
    expect(counts.items).toHaveLength(1)
    expect(counts.items[0]).toMatchObject({ name: 'Oil filter', quantity: 2 })
  })

  it('clears older unpaid duplicates but leaves other customers alone', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run(async (ctx) => {
      for (const userId of [s.userA, s.userA, s.userB]) {
        await ctx.db.insert('orders', { userId, status: 'pending', subtotal: 1, shipping: 0, tax: 0, total: 1 })
      }
    })
    await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    const orders = await t.run((ctx) => ctx.db.query('orders').collect())
    expect(orders.filter((o) => o.userId === s.userA)).toHaveLength(1)
    expect(orders.filter((o) => o.userId === s.userB)).toHaveLength(1)
  })

  it('never reuses an order that already has a payment attempt or is paid', async () => {
    const t = setup()
    const s = await seed(t)
    const a = asUser(t, 'user_a')
    const first = await a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    await t.mutation(api.orders.attachPayPal, { id: first.orderId, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })
    const second = await a.mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    expect(second.orderId).not.toBe(first.orderId)
    // the attempted order is still there
    expect(await t.run((ctx) => ctx.db.get(first.orderId))).not.toBeNull()
  })
})

describe('payment confirmation', () => {
  async function pendingOrder(t: ReturnType<typeof setup>, s: Awaited<ReturnType<typeof seed>>) {
    return (await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 3 }],
    })).orderId
  }

  it('only the server (with the secret) can mark an order paid', async () => {
    const t = setup()
    const s = await seed(t)
    const id = await pendingOrder(t, s)
    await expect(t.mutation(api.orders.markPaid, { id, paypalOrderId: 'PP', serverSecret: 'wrong' })).rejects.toThrow(/Not authorized/)
    await expect(asUser(t, 'user_a').mutation(api.orders.markPaid, { id, paypalOrderId: 'PP', serverSecret: '' })).rejects.toThrow(/Not authorized/)
    expect((await t.run((ctx) => ctx.db.get(id)))?.status).toBe('pending')
  })

  it('marks paid, deducts stock and counts sales exactly once', async () => {
    const t = setup()
    const s = await seed(t)
    const id = await pendingOrder(t, s)
    await t.mutation(api.orders.markPaid, { id, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })
    const product = await t.run((ctx) => ctx.db.get(s.p1))
    expect(product).toMatchObject({ stockQty: 7, totalSold: 3 })
    expect((await t.run((ctx) => ctx.db.get(id)))?.status).toBe('paid')
    // a second confirmation is refused, so stock cannot be deducted twice
    await expect(t.mutation(api.orders.markPaid, { id, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })).rejects.toThrow(/not awaiting payment/)
    expect((await t.run((ctx) => ctx.db.get(s.p1)))?.stockQty).toBe(7)
  })

  it('cannot pay an order that was cancelled', async () => {
    const t = setup()
    const s = await seed(t)
    const id = await pendingOrder(t, s)
    await asAdmin(t).mutation(api.orders.updateStatus, { id, status: 'cancelled' })
    await expect(t.mutation(api.orders.markPaid, { id, paypalOrderId: 'PP', serverSecret: 'test-secret' })).rejects.toThrow(/not awaiting payment/)
  })
})

describe('order status and stock', () => {
  async function paidOrder(t: ReturnType<typeof setup>, s: Awaited<ReturnType<typeof seed>>) {
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 3 }],
    })
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP', serverSecret: 'test-secret' })
    return orderId
  }
  const stock = (t: ReturnType<typeof setup>, id: any) => t.run(async (ctx) => (await ctx.db.get(id))!)

  it('cancelling puts the stock back, once', async () => {
    const t = setup()
    const s = await seed(t)
    const id = await paidOrder(t, s)
    const admin = asAdmin(t)
    await admin.mutation(api.orders.updateStatus, { id, status: 'cancelled' })
    expect(await stock(t, s.p1)).toMatchObject({ stockQty: 10, totalSold: 0 })
    await admin.mutation(api.orders.updateStatus, { id, status: 'cancelled' })
    expect(await stock(t, s.p1)).toMatchObject({ stockQty: 10, totalSold: 0 })
  })

  it('moving through shipped and delivered does not touch stock', async () => {
    const t = setup()
    const s = await seed(t)
    const id = await paidOrder(t, s)
    const admin = asAdmin(t)
    for (const status of ['processing', 'shipped', 'delivered'] as const) {
      await admin.mutation(api.orders.updateStatus, { id, status })
      expect(await stock(t, s.p1)).toMatchObject({ stockQty: 7, totalSold: 3 })
    }
  })

  it('un-cancelling takes the stock out again', async () => {
    const t = setup()
    const s = await seed(t)
    const id = await paidOrder(t, s)
    const admin = asAdmin(t)
    await admin.mutation(api.orders.updateStatus, { id, status: 'cancelled' })
    await admin.mutation(api.orders.updateStatus, { id, status: 'paid' })
    expect(await stock(t, s.p1)).toMatchObject({ stockQty: 7, totalSold: 3 })
  })

  it('setting an unpaid order to paid by hand deducts stock', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 2 }],
    })
    await asAdmin(t).mutation(api.orders.updateStatus, { id: orderId, status: 'paid' })
    expect(await stock(t, s.p1)).toMatchObject({ stockQty: 8, totalSold: 2 })
  })

  it('cancelling an unpaid order changes no stock', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 2 }],
    })
    await asAdmin(t).mutation(api.orders.updateStatus, { id: orderId, status: 'cancelled' })
    expect(await stock(t, s.p1)).toMatchObject({ stockQty: 10 })
  })

  it('only admins can change a status', async () => {
    const t = setup()
    const s = await seed(t)
    const id = await paidOrder(t, s)
    await expect(asUser(t, 'user_a').mutation(api.orders.updateStatus, { id, status: 'delivered' })).rejects.toThrow(/Admin access required/)
    await expect(t.mutation(api.orders.updateStatus, { id, status: 'delivered' })).rejects.toThrow(/Not authenticated/)
  })
})

describe('who can read orders', () => {
  it('customers see only their own; admins see all with customer details', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    const b = asUser(t, 'user_b')
    expect(await b.query(api.orders.getById, { id: orderId })).toBeNull()
    expect(await b.query(api.orders.getOwned, { id: orderId })).toBeNull()
    expect(await b.query(api.orders.listByUser, {})).toEqual([])
    expect(await asUser(t, 'user_a').query(api.orders.getOwned, { id: orderId })).not.toBeNull()
    expect(await asUser(t, 'user_a').query(api.orders.getById, { id: orderId })).not.toBeNull()

    const all = await asAdmin(t).query(api.orders.listAll, {})
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ customerName: 'Alice', customerEmail: 'a@example.com' })
  })

  it('admin-only lists are empty for everyone else', async () => {
    const t = setup()
    const s = await seed(t)
    await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    for (const caller of [t, asUser(t, 'user_b')]) {
      expect(await caller.query(api.orders.listAll, {})).toEqual([])
      expect(await caller.query(api.orders.listRecent, {})).toEqual([])
      expect(await caller.query(api.users.list, {})).toEqual([])
    }
  })

  it('unpaid checkouts do not show in recent orders', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    const admin = asAdmin(t)
    expect(await admin.query(api.orders.listRecent, {})).toHaveLength(0)
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP', serverSecret: 'test-secret' })
    expect(await admin.query(api.orders.listRecent, {})).toHaveLength(1)
  })
})
