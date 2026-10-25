import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import { asUser, seed, setup, type T } from './helpers'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

const ADDRESS = { name: 'Alice', street: '1 Main Road', city: 'Pretoria', postalCode: '0182', country: 'South Africa' }

async function guestOrder(t: T, productId: Awaited<ReturnType<typeof seed>>['p1'], email: string, paid = true) {
  const created = await t.mutation(api.orders.createGuest, { items: [{ productId, quantity: 1 }], email, address: ADDRESS })
  if (paid) await t.mutation(api.orders.markPaid, { id: created.orderId, paypalOrderId: `PP-${created.orderId}`, serverSecret: 'test-secret' })
  return created
}

const link = (t: T, clerkId: string, verifiedEmails: string[], serverSecret = 'test-secret') =>
  t.mutation(api.orders.linkGuestOrders, { clerkId, verifiedEmails, serverSecret })

describe('linking guest orders to an account', () => {
  it("moves the customer's guest orders into their account, and leaves other people's alone", async () => {
    const t = setup()
    const s = await seed(t)
    const mine = await guestOrder(t, s.p1, 'A@Example.com')
    const unpaid = await guestOrder(t, s.p2, 'a@example.com', false)
    const theirs = await guestOrder(t, s.p2, 'someone@example.com')

    expect(await link(t, 'user_a', ['a@example.com'])).toEqual({ linked: 1 })

    const orders = await asUser(t, 'user_a').query(api.orders.listByUser, {})
    expect(orders.map((o) => o._id).sort()).toEqual([mine.orderId, unpaid.orderId].sort())
    expect((await t.run((ctx) => ctx.db.get(theirs.orderId)))?.userId).toBeUndefined()

    // Links in the earlier guest emails keep working.
    expect(await t.query(api.orders.getGuest, { id: mine.orderId, token: mine.guestToken })).not.toBeNull()
    expect(await t.query(api.invoices.get, { orderId: mine.orderId, guestToken: mine.guestToken })).not.toBeNull()

    // Running it again changes nothing.
    expect(await link(t, 'user_a', ['a@example.com'])).toEqual({ linked: 0 })
  })

  it('only runs for the server, and not for unknown or deactivated accounts', async () => {
    const t = setup()
    const s = await seed(t)
    await guestOrder(t, s.p1, 'a@example.com')
    await expect(link(t, 'user_a', ['a@example.com'], 'guess')).rejects.toThrow('Not authorized')
    expect(await link(t, 'nobody', ['a@example.com'])).toEqual({ linked: 0 })
    await t.run((ctx) => ctx.db.patch(s.userA, { isActive: false }))
    expect(await link(t, 'user_a', ['a@example.com'])).toEqual({ linked: 0 })
  })
})
