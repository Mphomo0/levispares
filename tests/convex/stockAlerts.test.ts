import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import { seed, setup } from './helpers'

describe('back-in-stock alerts', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
  })

  it('signs up once per email, only for parts that are out of stock', async () => {
    const t = setup()
    const s = await seed(t)
    await expect(t.mutation(api.stockAlerts.subscribe, { productId: s.p1, email: 'a@example.com' }))
      .rejects.toThrow('in stock now')
    await t.run((ctx) => ctx.db.patch(s.p1, { stockQty: 0 }))
    await t.mutation(api.stockAlerts.subscribe, { productId: s.p1, email: ' A@Example.com ' })
    await t.mutation(api.stockAlerts.subscribe, { productId: s.p1, email: 'a@example.com' })
    await expect(t.mutation(api.stockAlerts.subscribe, { productId: s.p1, email: 'nope' })).rejects.toThrow('valid email')
    expect(await t.run((ctx) => ctx.db.query('stockAlerts').collect())).toEqual([
      expect.objectContaining({ email: 'a@example.com', productId: s.p1 }),
    ])
  })

  it('emails everyone waiting once the part is back, and only once', async () => {
    const t = setup()
    const s = await seed(t)
    await t.run((ctx) => ctx.db.patch(s.p1, { stockQty: 0, slug: 'brake-pad' }))
    await t.mutation(api.stockAlerts.subscribe, { productId: s.p1, email: 'a@example.com' })
    await t.mutation(api.stockAlerts.subscribe, { productId: s.p1, email: 'b@example.com' })
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Shop <orders@example.com>'
    const fetchMock = vi.fn(async () => new Response('{"id":"1"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await t.action(internal.stockAlerts.sendDue, {})).toEqual({ sent: 0, failed: 0 }) // still out of stock
    await t.run((ctx) => ctx.db.patch(s.p1, { stockQty: 4 }))
    expect(await t.action(internal.stockAlerts.sendDue, {})).toEqual({ sent: 2, failed: 0 })
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.subject).toBe('Back in stock: Brake pad')
    expect(body.html).toContain('/products/brake-pad?')
    expect(await t.action(internal.stockAlerts.sendDue, {})).toEqual({ sent: 0, failed: 0 })
  })
})
