import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import { REMIND_AFTER_MS, REMIND_WITHIN_MS } from '../../convex/carts'
import { cartReminderEmail } from '../../convex/lib/cartEmail'
import { asUser, seed, setup, type T } from './helpers'

const HOUR = 60 * 60 * 1000

async function cartOf(t: T, userId: string) {
  return t.run((ctx) => ctx.db.query('carts').filter((q) => q.eq(q.field('userId'), userId)).unique())
}

describe('carts.save and carts.mine', () => {
  it('saves the cart and returns it with current product details', async () => {
    const t = setup()
    const s = await seed(t)
    await asUser(t, 'user_a').mutation(api.carts.save, { items: [{ productId: s.p1, quantity: 2 }] })

    const mine = await asUser(t, 'user_a').query(api.carts.mine, {})
    expect(mine).toEqual([expect.objectContaining({ _id: s.p1, name: 'Brake pad', price: 100, quantity: 2 })])
    expect((await cartOf(t, s.userA))?.token).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('keeps updatedAt when the same items are saved again', async () => {
    const t = setup()
    const s = await seed(t)
    const items = [{ productId: s.p1, quantity: 2 }]
    await asUser(t, 'user_a').mutation(api.carts.save, { items })
    const before = (await cartOf(t, s.userA))!
    await t.run((ctx) => ctx.db.patch(before._id, { updatedAt: 1 }))
    await asUser(t, 'user_a').mutation(api.carts.save, { items })
    expect((await cartOf(t, s.userA))?.updatedAt).toBe(1)
  })

  it('drops products that are inactive or out of stock, and caps quantity at stock', async () => {
    const t = setup()
    const s = await seed(t)
    await asUser(t, 'user_a').mutation(api.carts.save, {
      items: [{ productId: s.p1, quantity: 50 }, { productId: s.p2, quantity: 1 }],
    })
    await t.run((ctx) => ctx.db.patch(s.p2, { active: false }))
    const mine = await asUser(t, 'user_a').query(api.carts.mine, {})
    expect(mine).toEqual([expect.objectContaining({ _id: s.p1, quantity: 10 })])
  })

  it('returns null before the user record exists, and rejects saving when signed out', async () => {
    const t = setup()
    const s = await seed(t)
    expect(await asUser(t, 'user_new').query(api.carts.mine, {})).toBeNull()
    await expect(t.mutation(api.carts.save, { items: [{ productId: s.p1, quantity: 1 }] })).rejects.toThrow('Not authenticated')
  })
})

describe('carts.dueForReminder', () => {
  async function cartAt(t: T, userId: never, updatedAt: number, extra: Record<string, unknown> = {}) {
    const s = await t.run((ctx) => ctx.db.query('products').first())
    return t.run((ctx) => ctx.db.insert('carts', {
      userId, items: [{ productId: s!._id, quantity: 1 }], updatedAt, token: `tok-${updatedAt}`, ...extra,
    }))
  }

  it('picks carts idle for longer than the wait and not yet reminded', async () => {
    const t = setup()
    const s = await seed(t)
    const now = Date.now()
    await cartAt(t, s.userA as never, now - REMIND_AFTER_MS - HOUR)
    await cartAt(t, s.userB as never, now - HOUR) // too recent

    const due = await t.query(internal.carts.dueForReminder, { now })
    expect(due).toHaveLength(1)
    expect(due[0]).toMatchObject({ email: 'a@example.com', name: 'Alice', lines: [{ name: 'Brake pad', price: 100, quantity: 1 }] })
  })

  it('skips stale, already-reminded, empty and opted-out carts', async () => {
    const t = setup()
    const s = await seed(t)
    const now = Date.now()
    const idle = now - REMIND_AFTER_MS - HOUR
    await cartAt(t, s.userA as never, now - REMIND_WITHIN_MS - HOUR) // stale
    await cartAt(t, s.userB as never, idle, { remindedAt: idle + 1 })
    await cartAt(t, s.admin as never, idle, { items: [] })
    expect(await t.query(internal.carts.dueForReminder, { now })).toHaveLength(0)

    const t2 = setup()
    const s2 = await seed(t2)
    await t2.run((ctx) => ctx.db.patch(s2.userA, { cartRemindersOff: true }))
    await cartAt(t2, s2.userA as never, idle)
    expect(await t2.query(internal.carts.dueForReminder, { now })).toHaveLength(0)
  })

  it('reminds again once the cart has changed since the last reminder', async () => {
    const t = setup()
    const s = await seed(t)
    const now = Date.now()
    const idle = now - REMIND_AFTER_MS - HOUR
    await cartAt(t, s.userA as never, idle, { remindedAt: idle - HOUR })
    expect(await t.query(internal.carts.dueForReminder, { now })).toHaveLength(1)
  })
})

describe('cartReminders.sendDue', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.RESEND_API_KEY
    delete process.env.CART_EMAIL_FROM
  })

  it('emails each due cart through Resend and records the reminder', async () => {
    const t = setup()
    const s = await seed(t)
    process.env.RESEND_API_KEY = 're_test'
    process.env.CART_EMAIL_FROM = 'Shop <shop@example.com>'
    const fetchMock = vi.fn(async () => new Response('{"id":"1"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const cartId = await t.run((ctx) => ctx.db.insert('carts', {
      userId: s.userA, items: [{ productId: s.p1, quantity: 1 }], updatedAt: Date.now() - REMIND_AFTER_MS - HOUR, token: 'tok',
    }))

    expect(await t.action(internal.cartReminders.sendDue, {})).toEqual({ sent: 1, failed: 0 })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({ from: 'Shop <shop@example.com>', to: ['a@example.com'], subject: 'You left Brake pad in your cart' })
    expect((await t.run((ctx) => ctx.db.get(cartId)))?.remindedAt).toBeDefined()

    // Nothing more to send on the next run.
    expect(await t.action(internal.cartReminders.sendDue, {})).toEqual({ sent: 0, failed: 0 })
  })

  it('leaves the cart due when Resend rejects the email', async () => {
    const t = setup()
    const s = await seed(t)
    process.env.RESEND_API_KEY = 're_test'
    process.env.CART_EMAIL_FROM = 'Shop <shop@example.com>'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('bad', { status: 422 })))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const cartId = await t.run((ctx) => ctx.db.insert('carts', {
      userId: s.userA, items: [{ productId: s.p1, quantity: 1 }], updatedAt: Date.now() - REMIND_AFTER_MS - HOUR, token: 'tok',
    }))
    expect(await t.action(internal.cartReminders.sendDue, {})).toEqual({ sent: 0, failed: 1 })
    expect((await t.run((ctx) => ctx.db.get(cartId)))?.remindedAt).toBeUndefined()
  })

  it('does nothing without Resend settings', async () => {
    const t = setup()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await t.action(internal.cartReminders.sendDue, {})).toEqual({ sent: 0, failed: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('carts.byToken', () => {
  it('returns the cart behind an email link, and null for an unknown token', async () => {
    const t = setup()
    const s = await seed(t)
    await asUser(t, 'user_a').mutation(api.carts.save, { items: [{ productId: s.p2, quantity: 3 }] })
    const cart = (await cartOf(t, s.userA))!

    expect(await t.query(api.carts.byToken, { token: cart.token }))
      .toEqual([expect.objectContaining({ _id: s.p2, name: 'Oil filter', quantity: 3 })])
    expect(await t.query(api.carts.byToken, { token: 'nope' })).toBeNull()
  })
})

describe('unsubscribing and paying', () => {
  it('turns reminders off from the email link, and back on from settings', async () => {
    const t = setup()
    const s = await seed(t)
    await asUser(t, 'user_a').mutation(api.carts.save, { items: [{ productId: s.p1, quantity: 1 }] })
    const cart = (await cartOf(t, s.userA))!

    await t.mutation(api.carts.unsubscribe, { token: cart.token })
    expect((await t.run((ctx) => ctx.db.get(s.userA)))?.cartRemindersOff).toBe(true)
    await expect(t.mutation(api.carts.unsubscribe, { token: 'nope' })).rejects.toThrow('no longer valid')

    await asUser(t, 'user_a').mutation(api.carts.setReminders, { enabled: true })
    expect((await t.run((ctx) => ctx.db.get(s.userA)))?.cartRemindersOff).toBe(false)
  })

  it('empties the cart and records a recovery when a reminded customer pays', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run((ctx) => ctx.db.insert('carts', {
      userId: s.userA, items: [{ productId: s.p1, quantity: 1 }], updatedAt: 1, token: 'tok', remindedAt: 2,
    }))
    const orderId = await t.run((ctx) => ctx.db.insert('orders', {
      userId: s.userA, status: 'pending', subtotal: 100, shipping: 0, tax: 0, total: 100,
    }))
    await t.mutation(api.orders.markPaid, { id: orderId, paypalOrderId: 'PP-1', serverSecret: 'test-secret' })

    const cart = await cartOf(t, s.userA)
    expect(cart?.items).toEqual([])
    expect(cart?.recoveredAt).toBeDefined()
  })
})

describe('cartReminderEmail', () => {
  it('escapes product names and links to the recover and unsubscribe pages', () => {
    const email = cartReminderEmail({
      name: 'Alice Smith',
      token: 'abc',
      lines: [{ name: 'Pad <b>', price: 100, quantity: 2 }, { name: 'Filter', price: 49.99, quantity: 1 }],
    })
    expect(email.subject).toBe('You left 2 items in your cart')
    expect(email.html).toContain('Hi Alice,')
    expect(email.html).toContain('Pad &lt;b&gt;')
    expect(email.html).toContain('R249.99')
    expect(email.html).toContain('/cart/recover/abc?')
    expect(email.unsubscribe).toBe('https://www.levispares.co.za/unsubscribe?token=abc')
  })
})
