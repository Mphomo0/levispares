import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { orderEmail, orderNumber } from '../../convex/lib/orderEmail'
import { asAdmin, asUser, seed, setup, type T } from './helpers'

const DAY = 24 * 60 * 60 * 1000

async function addCode(t: T, fields: Partial<{
  code: string; name: string; type: 'percentage' | 'fixed'; value: number
  minOrderValue: number; maxUses: number; startsAt: number; expiresAt: number
}> = {}) {
  return asAdmin(t).mutation(api.promotions.add, { code: 'save10', name: 'Ten off', type: 'percentage', value: 10, ...fields })
}

const GUEST_ADDRESS = {
  name: 'Gina Guest', street: '5 Long Street', city: 'Durban', province: 'KZN',
  postalCode: '4001', country: 'South Africa', phone: '0311234567',
}

describe('promo codes: admin', () => {
  it('stores codes in capitals and refuses duplicates and bad values', async () => {
    const t = setup()
    await seed(t)
    await addCode(t, { code: ' save10 ' })
    const [promo] = await asAdmin(t).query(api.promotions.listAll, {})
    expect(promo).toMatchObject({ code: 'SAVE10', usedCount: 0, active: true })

    await expect(addCode(t, { code: 'Save10' })).rejects.toThrow('already exists')
    await expect(addCode(t, { code: 'X' })).rejects.toThrow('3 to 32')
    await expect(addCode(t, { code: 'BIG', value: 150 })).rejects.toThrow('at most 100')
    await expect(addCode(t, { code: 'ZERO', value: 0 })).rejects.toThrow('more than 0')
    await expect(addCode(t, { code: 'DATES', startsAt: 10, expiresAt: 5 })).rejects.toThrow('after the start')
  })

  it('is admin-only, and customers cannot list codes', async () => {
    const t = setup()
    await seed(t)
    await expect(asUser(t, 'user_a').mutation(api.promotions.add, {
      code: 'HACK', name: 'x', type: 'fixed', value: 1000,
    })).rejects.toThrow('Admin access required')
    await addCode(t)
    expect(await asUser(t, 'user_a').query(api.promotions.listAll, {})).toEqual([])
  })

  it('clears limits that are left blank when editing', async () => {
    const t = setup()
    await seed(t)
    const id = await addCode(t, { maxUses: 5, minOrderValue: 100 })
    await asAdmin(t).mutation(api.promotions.update, { id, code: 'SAVE10', name: 'Ten off', type: 'percentage', value: 15 })
    const promo = await t.run((ctx) => ctx.db.get(id))
    expect(promo).toMatchObject({ value: 15 })
    expect(promo?.maxUses).toBeUndefined()
    expect(promo?.minOrderValue).toBeUndefined()
  })
})

describe('promo codes: checking a code', () => {
  it('works out percentage and fixed discounts, ignoring case', async () => {
    const t = setup()
    await seed(t)
    await addCode(t)
    await addCode(t, { code: 'R50', name: 'R50 off', type: 'fixed', value: 50 })
    expect(await t.query(api.promotions.check, { code: 'save10', subtotal: 249.99 }))
      .toEqual({ ok: true, code: 'SAVE10', name: 'Ten off', discount: 25 })
    expect(await t.query(api.promotions.check, { code: 'r50', subtotal: 30 }))
      .toMatchObject({ ok: true, discount: 30 }) // never more than the items cost
  })

  it.each([
    ['unknown', {}, 'NOPE', 'not valid'],
    ['expired', { expiresAt: Date.now() - DAY }, 'SAVE10', 'expired'],
    ['not started', { startsAt: Date.now() + DAY }, 'SAVE10', 'not active yet'],
    ['below the minimum', { minOrderValue: 1000 }, 'SAVE10', 'at least R1000.00'],
  ])('refuses a code that is %s', async (_label, fields, code, message) => {
    const t = setup()
    await seed(t)
    await addCode(t, fields)
    const result = await t.query(api.promotions.check, { code, subtotal: 200 })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toContain(message)
  })

  it('refuses a code that is used up or turned off', async () => {
    const t = setup()
    await seed(t)
    const id = await addCode(t, { maxUses: 1 })
    await t.run((ctx) => ctx.db.patch(id, { usedCount: 1 }))
    expect(await t.query(api.promotions.check, { code: 'SAVE10', subtotal: 200 })).toMatchObject({ ok: false, message: expect.stringContaining('fully used') })

    await t.run((ctx) => ctx.db.patch(id, { usedCount: 0 }))
    await asAdmin(t).mutation(api.promotions.setActive, { id, active: false })
    expect(await t.query(api.promotions.check, { code: 'SAVE10', subtotal: 200 })).toMatchObject({ ok: false, message: expect.stringContaining('no longer active') })
  })
})

describe('promo codes: on an order', () => {
  it('takes the discount off before tax and stores the code on the order', async () => {
    const t = setup()
    const s = await seed(t)
    await addCode(t)
    const result = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 2 }], shippingAddressId: s.addrA, promoCode: ' save10',
    })
    // R200 - R20 = R180, + R27 VAT (15%) + R250 shipping = R457
    expect(result).toMatchObject({ subtotal: 200, discount: 20, tax: 27, shipping: 250, total: 457, promoCode: 'SAVE10' })
    const order = await t.run((ctx) => ctx.db.get(result.orderId))
    expect(order).toMatchObject({ discount: 20, promoCode: 'SAVE10' })
  })

  it('refuses the order when the code cannot be used', async () => {
    const t = setup()
    const s = await seed(t)
    await addCode(t, { minOrderValue: 1000 })
    await expect(asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 1 }], promoCode: 'SAVE10',
    })).rejects.toThrow('at least R1000.00')
  })

  it('drops the code when the checkout is redone without it', async () => {
    const t = setup()
    const s = await seed(t)
    await addCode(t)
    const items = [{ productId: s.p1, quantity: 1 }]
    await asUser(t, 'user_a').mutation(api.orders.create, { items, promoCode: 'SAVE10' })
    const again = await asUser(t, 'user_a').mutation(api.orders.create, { items })
    const order = await t.run((ctx) => ctx.db.get(again.orderId))
    expect(order?.discount).toBe(0)
    expect(order?.promoCode).toBeUndefined()
  })

  it('counts a use only once the order is paid', async () => {
    vi.useFakeTimers()
    const t = setup()
    const s = await seed(t)
    const promoId = await addCode(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 1 }], promoCode: 'SAVE10',
    })
    expect((await t.run((ctx) => ctx.db.get(promoId)))?.usedCount).toBe(0)
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })
    expect((await t.run((ctx) => ctx.db.get(promoId)))?.usedCount).toBe(1)
    vi.useRealTimers()
  })
})

describe('guest checkout', () => {
  it('creates an order with no account, readable only with its token', async () => {
    const t = setup()
    const s = await seed(t)
    const created = await t.mutation(api.orders.createGuest, {
      items: [{ productId: s.p1, quantity: 1 }], email: ' Gina@Example.com ', address: GUEST_ADDRESS,
    })
    expect(created.total).toBe(365) // R100 + R15 VAT + R250 shipping
    expect(created.guestToken).toMatch(/^[0-9a-f-]{36}$/)

    const order = await t.run((ctx) => ctx.db.get(created.orderId))
    expect(order).toMatchObject({ status: 'pending', guestEmail: 'gina@example.com', shippingSnapshot: GUEST_ADDRESS })
    expect(order?.userId).toBeUndefined()

    const seen = await t.query(api.orders.getGuest, { id: created.orderId, token: created.guestToken })
    expect(seen).toMatchObject({ _id: created.orderId, items: [expect.objectContaining({ name: 'Brake pad' })] })
    expect(seen).not.toHaveProperty('guestToken')
    expect(await t.query(api.orders.getGuest, { id: created.orderId, token: 'wrong' })).toBeNull()
    expect(await asUser(t, 'user_a').query(api.orders.getById, { id: created.orderId })).toBeNull()
  })

  it('reuses the same unpaid order when the guest goes back and changes something', async () => {
    const t = setup()
    const s = await seed(t)
    const first = await t.mutation(api.orders.createGuest, {
      items: [{ productId: s.p1, quantity: 1 }], email: 'g@example.com', address: GUEST_ADDRESS,
    })
    const second = await t.mutation(api.orders.createGuest, {
      items: [{ productId: s.p2, quantity: 2 }], email: 'g@example.com', address: GUEST_ADDRESS,
      previous: { id: first.orderId, token: first.guestToken },
    })
    expect(second.orderId).toBe(first.orderId)
    expect(second.guestToken).toBe(first.guestToken)
    const items = await t.run((ctx) => ctx.db.query('orderItems').collect())
    expect(items).toEqual([expect.objectContaining({ productId: s.p2, quantity: 2 })])

    // A wrong token starts a fresh order instead of touching the first one.
    const third = await t.mutation(api.orders.createGuest, {
      items: [{ productId: s.p1, quantity: 1 }], email: 'g@example.com', address: GUEST_ADDRESS,
      previous: { id: first.orderId, token: 'wrong' },
    })
    expect(third.orderId).not.toBe(first.orderId)
  })

  it('needs a valid email and a delivery address', async () => {
    const t = setup()
    const s = await seed(t)
    const items = [{ productId: s.p1, quantity: 1 }]
    await expect(t.mutation(api.orders.createGuest, { items, email: 'not-an-email', address: GUEST_ADDRESS }))
      .rejects.toThrow('valid email')
    await expect(t.mutation(api.orders.createGuest, { items, email: 'g@example.com', address: { ...GUEST_ADDRESS, street: '  ' } }))
      .rejects.toThrow('delivery address')
  })

  it('shows guest details to admins and can be paid', async () => {
    vi.useFakeTimers()
    const t = setup()
    const s = await seed(t)
    const { orderId } = await t.mutation(api.orders.createGuest, {
      items: [{ productId: s.p1, quantity: 1 }], email: 'g@example.com', address: GUEST_ADDRESS,
    })
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })

    const [listed] = await asAdmin(t).query(api.orders.listAll, {})
    expect(listed).toMatchObject({ status: 'paid', customerName: 'Gina Guest', customerEmail: 'g@example.com' })
    const detail = await asAdmin(t).query(api.orders.getAdminDetail, { id: orderId })
    expect(detail?.customer).toEqual({ name: 'Gina Guest (guest)', email: 'g@example.com' })
    vi.useRealTimers()
  })
})

describe('order emails', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    delete process.env.ORDER_NOTIFY_EMAIL
  })

  async function scheduled(t: T) {
    const jobs = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect())
    return jobs.map((job) => (job.args[0] as { kind: string }).kind).sort()
  }

  async function paidOrder(t: T) {
    const s = await seed(t)
    const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, {
      items: [{ productId: s.p1, quantity: 1 }], shippingAddressId: s.addrA,
    })
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })
    return orderId
  }

  it('sends a confirmation and a shop alert when an order is paid', async () => {
    vi.useFakeTimers()
    const t = setup()
    await paidOrder(t)
    expect(await scheduled(t)).toEqual(['confirmation', 'newOrder'])
  })

  it('emails on shipped, delivered and cancelled, but not for an unpaid checkout', async () => {
    vi.useFakeTimers()
    const t = setup()
    const orderId = await paidOrder(t)
    for (const status of ['processing', 'shipped', 'shipped', 'delivered', 'cancelled'] as const) {
      await asAdmin(t).mutation(api.orders.updateStatus, { id: orderId, status })
    }
    expect(await scheduled(t)).toEqual(['cancelled', 'confirmation', 'delivered', 'newOrder', 'shipped'])

    const t2 = setup()
    const s2 = await seed(t2)
    const { orderId: unpaid } = await asUser(t2, 'user_a').mutation(api.orders.create, { items: [{ productId: s2.p1, quantity: 1 }] })
    await asAdmin(t2).mutation(api.orders.updateStatus, { id: unpaid, status: 'cancelled' })
    expect(await scheduled(t2)).toEqual([])
  })

  it('sends through Resend to the customer, and the shop alert to ORDER_NOTIFY_EMAIL', async () => {
    vi.useFakeTimers()
    const t = setup()
    const orderId = await paidOrder(t)
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Shop <shop@example.com>'
    process.env.ORDER_NOTIFY_EMAIL = 'orders@example.com'
    const fetchMock = vi.fn(async () => new Response('{"id":"1"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await t.action(internal.orderEmails.send, { orderId, kind: 'confirmation' })).toEqual({ sent: true })
    expect(await t.action(internal.orderEmails.send, { orderId, kind: 'newOrder' })).toEqual({ sent: true })
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse((call as unknown as [string, RequestInit])[1].body as string))
    expect(bodies[0]).toMatchObject({ to: ['a@example.com'], subject: `Thank you for your order (${orderNumber(orderId)})` })
    expect(bodies[1]).toMatchObject({ to: ['orders@example.com'], subject: expect.stringContaining('New order') })
  })

  it('skips the shop alert without ORDER_NOTIFY_EMAIL, and everything without Resend settings', async () => {
    vi.useFakeTimers()
    const t = setup()
    const orderId = await paidOrder(t)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await t.action(internal.orderEmails.send, { orderId, kind: 'confirmation' })).toEqual({ sent: false })

    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Shop <shop@example.com>'
    expect(await t.action(internal.orderEmails.send, { orderId, kind: 'newOrder' })).toEqual({ sent: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('builds the customer email with the discount, address and a guest link', () => {
    const email = orderEmail('shipped', {
      orderId: 'abcdefgh12345678' as Id<'orders'>,
      guestToken: 'tok',
      customerName: 'Gina <Guest>',
      customerEmail: 'g@example.com',
      items: [{ name: 'Brake pad', quantity: 2, price: 100 }],
      subtotal: 200, discount: 20, promoCode: 'SAVE10', shipping: 250, tax: 27, total: 457,
      address: GUEST_ADDRESS,
    })
    expect(email.subject).toBe('Your order is on its way (12345678)')
    expect(email.html).toContain('Hi Gina,')
    expect(email.html).toContain('Discount (SAVE10)')
    expect(email.html).toContain('-R20.00')
    expect(email.html).toContain('R457.00')
    expect(email.html).toContain('5 Long Street')
    expect(email.html).toContain('/checkout/success?orderId=abcdefgh12345678&amp;token=tok')
    expect(email.text).toContain('Total: R457.00')
  })
})
