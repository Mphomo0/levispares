import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { asAdmin, asUser, seed, setup, type T } from './helpers'

// Scheduled order emails stay queued instead of running during these tests.
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

const pay = (t: T, id: Id<'orders'>) =>
  t.mutation(api.orders.markPaid, { id, paypalOrderId: `PP-${id}`, serverSecret: 'test-secret' })

async function order(t: T, s: Awaited<ReturnType<typeof seed>>, extra: Record<string, unknown> = {}) {
  const { orderId } = await asUser(t, 'user_a').mutation(api.orders.create, {
    items: [{ productId: s.p1, quantity: 2 }], shippingAddressId: s.addrA, ...extra,
  })
  return orderId
}

describe('invoice numbers', () => {
  it('numbers paid orders in sequence, once each', async () => {
    const t = setup()
    const s = await seed(t)
    const first = await order(t, s)
    await pay(t, first)
    const { orderId: second } = await asUser(t, 'user_b').mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 1 }] })
    await pay(t, second)

    expect((await t.run((ctx) => ctx.db.get(first)))?.invoiceNumber).toBe('INV-00001')
    expect((await t.run((ctx) => ctx.db.get(second)))?.invoiceNumber).toBe('INV-00002')

    // Moving the order on, or cancelling it, keeps its number.
    await asAdmin(t).mutation(api.orders.updateStatus, { id: first, status: 'shipped' })
    await asAdmin(t).mutation(api.orders.updateStatus, { id: first, status: 'cancelled' })
    expect((await t.run((ctx) => ctx.db.get(first)))?.invoiceNumber).toBe('INV-00001')
  })

  it('numbers an order marked paid by hand, but not an unpaid one that is cancelled', async () => {
    const t = setup()
    const s = await seed(t)
    const manual = await order(t, s)
    await asAdmin(t).mutation(api.orders.updateStatus, { id: manual, status: 'paid' })
    expect((await t.run((ctx) => ctx.db.get(manual)))?.invoiceNumber).toBe('INV-00001')

    const { orderId: unpaid } = await asUser(t, 'user_b').mutation(api.orders.create, { items: [{ productId: s.p2, quantity: 1 }] })
    await asAdmin(t).mutation(api.orders.updateStatus, { id: unpaid, status: 'cancelled' })
    expect((await t.run((ctx) => ctx.db.get(unpaid)))?.invoiceNumber).toBeUndefined()
  })

  it('backfills older paid orders, oldest first', async () => {
    const t = setup()
    const s = await seed(t)
    const ids = await t.run(async (ctx) => {
      const base = { subtotal: 100, shipping: 0, tax: 0, total: 100 }
      return [
        await ctx.db.insert('orders', { userId: s.userA, status: 'delivered', ...base }),
        await ctx.db.insert('orders', { userId: s.userA, status: 'pending', ...base }),
        await ctx.db.insert('orders', { userId: s.userB, status: 'paid', ...base }),
        await ctx.db.insert('orders', { userId: s.userB, status: 'cancelled', ...base }),
      ]
    })
    expect(await t.mutation(internal.invoices.backfill, {})).toEqual({ numbered: 2 })
    const numbers = await t.run(async (ctx) => Promise.all(ids.map(async (id) => (await ctx.db.get(id))?.invoiceNumber ?? null)))
    expect(numbers).toEqual(['INV-00001', null, 'INV-00002', null])
  })
})

describe('invoices.get', () => {
  it('is a tax invoice with the VAT line and seller VAT number when VAT was charged', async () => {
    const t = setup()
    const s = await seed(t)
    await asAdmin(t).mutation(api.invoices.updateBusinessDetails, {
      businessName: "Levi's Spares (Pty) Ltd", businessAddress: 'Stand 10 Zambezi', businessPhone: '012 770 3389',
      businessEmail: 'info@example.com', vatNumber: '4123456789', registrationNumber: '2015/123456/07',
    })
    const id = await order(t, s, { company: { name: ' Acme Fleet ', vatNumber: '4 987 654 321' } })
    await pay(t, id)

    const invoice = await asUser(t, 'user_a').query(api.invoices.get, { orderId: id })
    expect(invoice).toMatchObject({
      title: 'Tax Invoice',
      invoiceNumber: 'INV-00001',
      vatCharged: true,
      vatRate: 15,
      tax: 30,
      total: 480,
      seller: { name: "Levi's Spares (Pty) Ltd", vatNumber: '4123456789' },
      buyer: { name: 'Alice', company: 'Acme Fleet', vatNumber: '4987654321', email: 'a@example.com' },
      items: [expect.objectContaining({ name: 'Brake pad', quantity: 2, total: 200 })],
    })
  })

  it('is a plain invoice without VAT details when VAT was off, even if VAT is switched on later', async () => {
    const t = setup()
    const s = await seed(t)
    await asAdmin(t).mutation(api.invoices.updateBusinessDetails, {
      businessName: '', businessAddress: '', businessPhone: '', businessEmail: '', vatNumber: '4123456789', registrationNumber: '',
    })
    await t.run(async (ctx) => {
      const settings = await ctx.db.query('storeSettings').first()
      await ctx.db.patch(settings!._id, { taxEnabled: false })
    })
    const id = await order(t, s)
    await pay(t, id)
    await t.run(async (ctx) => {
      const settings = await ctx.db.query('storeSettings').first()
      await ctx.db.patch(settings!._id, { taxEnabled: true })
    })

    const invoice = await asUser(t, 'user_a').query(api.invoices.get, { orderId: id })
    expect(invoice).toMatchObject({ title: 'Invoice', vatCharged: false, vatRate: 0, tax: 0, total: 450 })
    expect(invoice?.seller.vatNumber).toBeUndefined()
  })

  it('is only for the customer, a guest with the token, or an admin, and only once paid', async () => {
    const t = setup()
    const s = await seed(t)
    const id = await order(t, s)
    expect(await asUser(t, 'user_a').query(api.invoices.get, { orderId: id })).toBeNull() // not paid yet
    await pay(t, id)
    expect(await asUser(t, 'user_a').query(api.invoices.get, { orderId: id })).not.toBeNull()
    expect(await asUser(t, 'user_b').query(api.invoices.get, { orderId: id })).toBeNull()
    expect(await t.query(api.invoices.get, { orderId: id })).toBeNull()
    expect(await asAdmin(t).query(api.invoices.get, { orderId: id })).not.toBeNull()

    const guest = await t.mutation(api.orders.createGuest, {
      items: [{ productId: s.p2, quantity: 1 }], email: 'g@example.com',
      address: { name: 'Gina', street: '5 Long Street', city: 'Durban', postalCode: '4001', country: 'South Africa' },
    })
    await pay(t, guest.orderId)
    expect(await t.query(api.invoices.get, { orderId: guest.orderId, guestToken: guest.guestToken }))
      .toMatchObject({ buyer: { name: 'Gina', email: 'g@example.com' } })
    expect(await t.query(api.invoices.get, { orderId: guest.orderId, guestToken: 'wrong' })).toBeNull()
  })
})

describe('invoice details', () => {
  it('checks VAT numbers and is admin-only', async () => {
    const t = setup()
    await seed(t)
    const details = { businessName: 'x', businessAddress: '', businessPhone: '', businessEmail: '', registrationNumber: '' }
    await expect(asAdmin(t).mutation(api.invoices.updateBusinessDetails, { ...details, vatNumber: '12345' }))
      .rejects.toThrow('10 digits starting with 4')
    await expect(asUser(t, 'user_a').mutation(api.invoices.updateBusinessDetails, { ...details, vatNumber: '' }))
      .rejects.toThrow('Admin access required')
    expect(await asUser(t, 'user_a').query(api.invoices.businessDetails, {})).toBeNull()
  })

  it('refuses a badly formed customer VAT number at checkout', async () => {
    const t = setup()
    const s = await seed(t)
    await expect(order(t, s, { company: { name: 'Acme', vatNumber: '999' } })).rejects.toThrow('10 digits starting with 4')
  })
})
