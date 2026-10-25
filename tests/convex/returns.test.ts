import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { RETURN_WINDOW_MS } from '../../convex/returns'
import { returnEmail } from '../../convex/returnEmails'
import { asAdmin, asUser, seed, setup, type T } from './helpers'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

type Seed = Awaited<ReturnType<typeof seed>>

/** Alice buys 2 brake pads and 1 oil filter; it's paid (through PayPal) and delivered. */
async function deliveredOrder(t: T, s: Seed, extra: Record<string, unknown> = {}) {
  const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, {
    items: [{ productId: s.p1, quantity: 2 }, { productId: s.p2, quantity: 1 }], shippingAddressId: s.addrA, ...extra,
  })
  await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })
  await asAdmin(t).mutation(api.orders.updateStatus, { id: orderId, status: 'delivered' })
  return orderId
}

const requestReturn = (t: T, orderId: Id<'orders'>, productId: Id<'products'>, quantity = 1) =>
  asUser(t, 'user_a').mutation(api.returns.request, { orderId, items: [{ productId, quantity }], reason: 'wrong_part' })

async function scheduledKinds(t: T) {
  const jobs = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect())
  return jobs.map((job) => (job.args[0] as { kind: string }).kind)
}

describe('asking for a return', () => {
  it('opens once the order is delivered, for 14 days', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p1, quantity: 1 }] })
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })
    expect(await asUser(t, 'user_a').query(api.returns.forOrder, { orderId })).toMatchObject({ canRequest: false, deadline: null })
    await expect(requestReturn(t, orderId, s.p1)).rejects.toThrow('once your order has been delivered')

    await asAdmin(t).mutation(api.orders.updateStatus, { id: orderId, status: 'delivered' })
    const info = await asUser(t, 'user_a').query(api.returns.forOrder, { orderId })
    expect(info).toMatchObject({ canRequest: true, items: [{ productId: s.p1, name: 'Brake pad', maxQuantity: 1 }] })

    vi.setSystemTime(Date.now() + RETURN_WINDOW_MS + 1000)
    expect(await asUser(t, 'user_a').query(api.returns.forOrder, { orderId })).toMatchObject({ canRequest: false })
    await expect(requestReturn(t, orderId, s.p1)).rejects.toThrow('return period for this order has ended')
  })

  it('never lets more come back than was bought, counting earlier returns', async () => {
    const t = setup()
    const s = await seed(t)
    const orderId = await deliveredOrder(t, s)
    await requestReturn(t, orderId, s.p1, 1)
    await expect(requestReturn(t, orderId, s.p1, 2)).rejects.toThrow("can't return more than you bought")
    await requestReturn(t, orderId, s.p1, 1)

    const info = await asUser(t, 'user_a').query(api.returns.forOrder, { orderId })
    expect(info?.items).toEqual([expect.objectContaining({ productId: s.p2, maxQuantity: 1 })])
    expect(info?.returns).toHaveLength(2)
  })

  it('frees the items again when a return is rejected', async () => {
    const t = setup()
    const s = await seed(t)
    const orderId = await deliveredOrder(t, s)
    const id = await requestReturn(t, orderId, s.p1, 2)
    await asAdmin(t).mutation(api.returns.reject, { id, note: 'Fitted parts cannot be returned' })
    const info = await asUser(t, 'user_a').query(api.returns.forOrder, { orderId })
    expect(info?.items).toContainEqual(expect.objectContaining({ productId: s.p1, maxQuantity: 2 }))
  })

  it('needs details for "other", and only the customer (or a guest with the token) can ask', async () => {
    const t = setup()
    const s = await seed(t)
    const orderId = await deliveredOrder(t, s)
    await expect(asUser(t, 'user_a').mutation(api.returns.request, {
      orderId, items: [{ productId: s.p1, quantity: 1 }], reason: 'other',
    })).rejects.toThrow('tell us why')
    await expect(asUser(t, 'user_b').mutation(api.returns.request, {
      orderId, items: [{ productId: s.p1, quantity: 1 }], reason: 'damaged',
    })).rejects.toThrow('Order not found')
    expect(await asUser(t, 'user_b').query(api.returns.forOrder, { orderId })).toBeNull()

    const guest = await t.mutation(api.orders.createGuest, {
      items: [{ productId: s.p2, quantity: 1 }], email: 'g@example.com',
      address: { name: 'Gina', street: '5 Long Street', city: 'Durban', postalCode: '4001', country: 'South Africa' },
    })
    await t.mutation(api.orders.markPaid, { id: guest.orderId, paypalOrderId: 'PP-2', serverSecret: 'test-secret' })
    await asAdmin(t).mutation(api.orders.updateStatus, { id: guest.orderId, status: 'delivered' })
    await t.mutation(api.returns.request, {
      orderId: guest.orderId, guestToken: guest.guestToken, items: [{ productId: s.p2, quantity: 1 }], reason: 'damaged',
    })
    await expect(t.mutation(api.returns.request, {
      orderId: guest.orderId, guestToken: 'wrong', items: [{ productId: s.p2, quantity: 1 }], reason: 'damaged',
    })).rejects.toThrow('Order not found')
  })
})

describe('dealing with a return', () => {
  it('emails the shop on a request and the customer on approval', async () => {
    const t = setup()
    const s = await seed(t)
    const orderId = await deliveredOrder(t, s)
    const id = await requestReturn(t, orderId, s.p1)
    await asAdmin(t).mutation(api.returns.approve, { id })
    expect((await scheduledKinds(t)).filter((k) => ['requested', 'approved'].includes(k))).toEqual(['requested', 'approved'])
    await expect(asAdmin(t).mutation(api.returns.approve, { id })).rejects.toThrow('already been dealt with')
    await expect(asUser(t, 'user_a').mutation(api.returns.approve, { id })).rejects.toThrow('Admin access required')
  })

  it('suggests the items\' share of what was paid: discount off, VAT added back, no delivery', async () => {
    const t = setup()
    const s = await seed(t)
    await asAdmin(t).mutation(api.promotions.add, { code: 'SAVE10', name: 'Ten off', type: 'percentage', value: 10 })
    const orderId = await deliveredOrder(t, s, { promoCode: 'SAVE10' })
    await requestReturn(t, orderId, s.p1, 1)
    const [ret] = await asAdmin(t).query(api.returns.listAll, {})
    // R100 - 10% = R90, + 15% VAT = R103.50
    expect(ret).toMatchObject({ suggestedRefund: 103.5, paidWithPayPal: true, orderNumber: orderId.slice(-8).toUpperCase() })
  })

  it('refunding puts the parts back in stock, adds to the order\'s refunds and emails the customer', async () => {
    const t = setup()
    const s = await seed(t)
    const orderId = await deliveredOrder(t, s)
    const id = await requestReturn(t, orderId, s.p1, 2)
    await expect(asAdmin(t).mutation(api.returns.markRefunded, { id, amount: 230, paypalRefundId: 'R-1' }))
      .rejects.toThrow('Only an approved return')
    await asAdmin(t).mutation(api.returns.approve, { id })
    const stockBefore = (await t.run((ctx) => ctx.db.get(s.p1)))!.stockQty!

    // Paid through PayPal, so it has to be refunded through PayPal.
    await expect(asAdmin(t).mutation(api.returns.markRefunded, { id, amount: 230 })).rejects.toThrow('refund it through PayPal')
    await expect(asAdmin(t).mutation(api.returns.markRefunded, { id, amount: 99999, paypalRefundId: 'R-1' }))
      .rejects.toThrow('between R0.01 and')

    await asAdmin(t).mutation(api.returns.markRefunded, { id, amount: 230, paypalRefundId: 'R-1' })
    expect((await t.run((ctx) => ctx.db.get(s.p1)))!.stockQty).toBe(stockBefore + 2)
    expect((await t.run((ctx) => ctx.db.get(orderId)))!.refundedTotal).toBe(230)
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ status: 'refunded', refundAmount: 230, paypalRefundId: 'R-1' })
    expect(await scheduledKinds(t)).toContain('refunded')
  })

  it('lets an order paid another way be marked refunded by hand', async () => {
    const t = setup()
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 1 }] })
    await asAdmin(t).mutation(api.orders.updateStatus, { id: orderId, status: 'paid' })
    await asAdmin(t).mutation(api.orders.updateStatus, { id: orderId, status: 'delivered' })
    const id = await requestReturn(t, orderId, s.p2)
    await asAdmin(t).mutation(api.returns.approve, { id })
    await asAdmin(t).mutation(api.returns.markRefunded, { id, amount: 57.49 })
    expect((await t.run((ctx) => ctx.db.get(id)))?.status).toBe('refunded')
  })
})

describe('return emails', () => {
  const data = {
    orderId: 'abcdefgh12345678', customerName: 'Alice Smith', customerEmail: 'a@example.com',
    items: [{ name: 'Brake pad', quantity: 2, price: 100 }], reason: 'Damaged or faulty',
    returnAddress: "Levi's Spares\nStand 10 Zambezi", refundAmount: 230,
  }

  it('tells the customer where to send parts, and what was refunded', () => {
    const approved = returnEmail('approved', data)
    expect(approved.subject).toBe('Your return is approved (12345678)')
    expect(approved.text).toContain('Stand 10 Zambezi')
    expect(approved.html).toContain('Brake pad &times; 2')
    expect(returnEmail('refunded', data).text).toContain('refunded R230.00')
    expect(returnEmail('rejected', { ...data, adminNote: 'Fitted <parts>' }).html).toContain('Fitted &lt;parts&gt;')
  })
})
