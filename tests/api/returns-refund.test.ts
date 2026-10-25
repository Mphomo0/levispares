// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.fn()
const mutation = vi.fn()
const auth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({ auth: () => auth() }))
vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    query = query
    mutation = mutation
    setAuth() {}
  },
}))

process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'
process.env.NEXT_PUBLIC_PAYPAL_CURRENCY = 'USD'
process.env.PAYPAL_CLIENT_ID = 'id'
process.env.PAYPAL_CLIENT_SECRET = 'secret'

const route = await import('@/app/api/admin/returns/refund/route')

const QUOTE = { status: 'approved', orderId: 'order12345678', paypalOrderId: 'PP-1', exchangeRate: 18, maxRefund: 500 }
let calls: Array<{ url: string; init: any }>

const post = (body: unknown) =>
  route.POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }) as any)

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ userId: 'u1', sessionClaims: { metadata: { role: 'admin' } }, getToken: async () => 'tok' })
  query.mockResolvedValue({ ...QUOTE })
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any = {}) => {
    calls.push({ url, init })
    const json = (data: unknown) => ({ ok: true, json: async () => data, text: async () => JSON.stringify(data) })
    if (url.includes('/oauth2/token')) return json({ access_token: 'tok' })
    if (url.includes('/v2/checkout/orders/')) {
      return json({ id: 'PP-1', status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'CAP-1', status: 'COMPLETED' }] } }] })
    }
    if (url.includes('/captures/CAP-1/refund')) return json({ id: 'REF-1', status: 'COMPLETED' })
    throw new Error('unexpected fetch ' + url)
  }))
})

describe('refunding a return through PayPal', () => {
  it('refunds the rand amount converted at the order rate, then records it', async () => {
    const res = await post({ returnId: 'ret1', amount: 180 })
    expect(res.status).toBe(200)
    const refund = calls.find((c) => c.url.endsWith('/captures/CAP-1/refund'))!
    expect(JSON.parse(refund.init.body).amount).toEqual({ currency_code: 'USD', value: '10.00' })
    expect(refund.init.headers['PayPal-Request-Id']).toBe('return-ret1')
    expect(mutation.mock.calls[0][1]).toEqual({ id: 'ret1', amount: 180, paypalRefundId: 'REF-1' })
  })

  it('refuses non-admins, unapproved returns, too much, and orders not paid with PayPal', async () => {
    auth.mockResolvedValueOnce({ userId: 'u1', sessionClaims: {}, getToken: async () => 'tok' })
    expect((await post({ returnId: 'ret1', amount: 10 })).status).toBe(403)

    query.mockResolvedValueOnce({ ...QUOTE, status: 'requested' })
    expect((await post({ returnId: 'ret1', amount: 10 })).status).toBe(409)

    expect((await post({ returnId: 'ret1', amount: 600 })).status).toBe(400)

    query.mockResolvedValueOnce({ ...QUOTE, paypalOrderId: undefined })
    expect((await post({ returnId: 'ret1', amount: 10 })).status).toBe(400)

    expect(calls.some((c) => c.url.includes('/refund'))).toBe(false)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('records nothing when PayPal refuses the refund', async () => {
    vi.mocked(fetch).mockImplementation(async (url: any) => {
      if (String(url).includes('/oauth2/token')) return { ok: true, json: async () => ({ access_token: 'tok' }) } as any
      if (String(url).includes('/v2/checkout/orders/')) {
        return { ok: true, json: async () => ({ purchase_units: [{ payments: { captures: [{ id: 'CAP-1' }] } }] }) } as any
      }
      return { ok: false, text: async () => 'REFUND_FAILED' } as any
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await post({ returnId: 'ret1', amount: 18 })).status).toBe(500)
    expect(mutation).not.toHaveBeenCalled()
  })
})
