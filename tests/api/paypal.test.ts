// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getOwned = vi.fn()
const mutation = vi.fn()

vi.mock('@/lib/serverConvex', () => ({
  getConvexAsUser: vi.fn(async () => ({ query: getOwned })),
}))
vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    mutation = mutation
  },
}))

process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'
process.env.NEXT_PUBLIC_PAYPAL_CURRENCY = 'USD'
process.env.PAYPAL_CLIENT_ID = 'id'
process.env.PAYPAL_CLIENT_SECRET = 'secret'
process.env.PAYMENT_SERVER_SECRET = 'server-secret'

const { getConvexAsUser } = await import('@/lib/serverConvex')
const createRoute = await import('@/app/api/paypal/create-order/route')
const captureRoute = await import('@/app/api/paypal/capture-order/route')

// R100 x2 + R49.99 x1 + R250 shipping + R37.50 tax = R537.49; at R18 per $1:
// items $5.56 x2 + $2.78 = $13.90, shipping $13.89, tax $2.08 => $29.87
const ORDER = {
  _id: 'order1',
  status: 'pending',
  shipping: 250,
  tax: 37.5,
  total: 537.49,
  exchangeRate: 18,
  items: [
    { name: 'Brake pad', price: 100, quantity: 2 },
    { name: 'Oil filter', price: 49.99, quantity: 1 },
  ],
}
const USD_TOTAL = '29.87'

let paypalCalls: Array<{ url: string; method: string; body?: any }>
let paypalOrder: any
let captureResult: any

function stubPayPal() {
  paypalCalls = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: any = {}) => {
    const method = init.method ?? 'GET'
    const body = init.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : init.body
    paypalCalls.push({ url, method, body })
    const json = (data: unknown) => ({ ok: true, json: async () => data, text: async () => JSON.stringify(data) })
    if (url.includes('/oauth2/token')) return json({ access_token: 'tok' })
    if (url.endsWith('/capture')) return json(captureResult)
    if (url.includes('/v2/checkout/orders') && method === 'POST') return json({ id: 'PP-NEW' })
    if (url.includes('/v2/checkout/orders/')) return json(paypalOrder)
    throw new Error('unexpected fetch ' + url)
  }))
}

const post = (route: { POST: (r: any) => Promise<Response> }, body: unknown) =>
  route.POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }) as any)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getConvexAsUser).mockResolvedValue({ query: getOwned } as any)
  getOwned.mockResolvedValue({ ...ORDER })
  stubPayPal()
  paypalOrder = {
    id: 'PP-1', status: 'APPROVED',
    purchase_units: [{ reference_id: 'order1', amount: { currency_code: 'USD', value: USD_TOTAL } }],
  }
  captureResult = {
    id: 'PP-1', status: 'COMPLETED',
    purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { currency_code: 'USD', value: USD_TOTAL } }] } }],
  }
})

describe('create-order', () => {
  it('builds the PayPal charge from the stored order, converted to dollars', async () => {
    const res = await post(createRoute, { convexOrderId: 'order1', totalAmount: 1, items: [{ price: 0.01 }] })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'PP-NEW' })
    const create = paypalCalls.find((c) => c.url.endsWith('/v2/checkout/orders') && c.method === 'POST')!
    const unit = create.body.purchase_units[0]
    expect(unit.reference_id).toBe('order1')
    expect(unit.amount).toMatchObject({ currency_code: 'USD', value: USD_TOTAL })
    expect(unit.amount.breakdown).toMatchObject({
      item_total: { value: '13.90' }, shipping: { value: '13.89' }, tax_total: { value: '2.08' },
    })
    expect(unit.items.map((i: any) => [i.name, i.quantity, i.unit_amount.value])).toEqual([
      ['Brake pad', '2', '5.56'], ['Oil filter', '1', '2.78'],
    ])
  })

  it('ignores amounts sent by the browser', async () => {
    await post(createRoute, { convexOrderId: 'order1', totalAmount: 0.01, shipping: 0, tax: 0, items: [] })
    const create = paypalCalls.find((c) => c.url.endsWith('/v2/checkout/orders') && c.method === 'POST')!
    expect(create.body.purchase_units[0].amount.value).toBe(USD_TOTAL)
  })

  it('refuses when signed out, unknown order, or already paid', async () => {
    vi.mocked(getConvexAsUser).mockResolvedValueOnce(null)
    expect((await post(createRoute, { convexOrderId: 'order1' })).status).toBe(401)
    getOwned.mockResolvedValueOnce(null)
    expect((await post(createRoute, { convexOrderId: 'order1' })).status).toBe(404)
    getOwned.mockResolvedValueOnce({ ...ORDER, status: 'paid' })
    expect((await post(createRoute, { convexOrderId: 'order1' })).status).toBe(409)
    expect((await post(createRoute, {})).status).toBe(400)
    expect(paypalCalls.filter((c) => c.method === 'POST' && !c.url.includes('oauth'))).toHaveLength(0)
  })

  it('is unavailable (503) when no exchange rate is set, and calls nothing', async () => {
    getOwned.mockResolvedValueOnce({ ...ORDER, exchangeRate: undefined })
    expect((await post(createRoute, { convexOrderId: 'order1' })).status).toBe(503)
    expect(paypalCalls).toHaveLength(0)
  })
})

describe('capture-order', () => {
  it('captures a matching payment and marks the order paid with the server secret', async () => {
    const res = await post(captureRoute, { paypalOrderId: 'PP-1', convexOrderId: 'order1' })
    expect(res.status).toBe(200)
    expect(paypalCalls.some((c) => c.url.endsWith('/capture'))).toBe(true)
    expect(mutation).toHaveBeenCalledTimes(2) // attachPayPal, then markPaid
    expect(mutation.mock.calls[0][1]).toMatchObject({ id: 'order1', paypalOrderId: 'PP-1', serverSecret: 'server-secret' })
    expect(mutation.mock.calls[1][1]).toMatchObject({ id: 'order1', paypalOrderId: 'PP-1', serverSecret: 'server-secret' })
  })

  it.each([
    ['a different amount (cheaper order)', { purchase_units: [{ reference_id: 'order1', amount: { currency_code: 'USD', value: '0.01' } }] }],
    ['a different order reference', { purchase_units: [{ reference_id: 'someone-elses', amount: { currency_code: 'USD', value: USD_TOTAL } }] }],
    ['a different currency', { purchase_units: [{ reference_id: 'order1', amount: { currency_code: 'EUR', value: USD_TOTAL } }] }],
    ['no order reference at all', { purchase_units: [{ amount: { currency_code: 'USD', value: USD_TOTAL } }] }],
  ])('refuses, and never captures, a payment with %s', async (_label, patch) => {
    paypalOrder = { ...paypalOrder, ...patch }
    const res = await post(captureRoute, { paypalOrderId: 'PP-1', convexOrderId: 'order1' })
    expect(res.status).toBe(400)
    expect(paypalCalls.some((c) => c.url.endsWith('/capture'))).toBe(false)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('does not mark paid if PayPal reports an incomplete or different capture', async () => {
    captureResult.purchase_units[0].payments.captures[0].amount.value = '1.00'
    expect((await post(captureRoute, { paypalOrderId: 'PP-1', convexOrderId: 'order1' })).status).toBe(400)
    expect(mutation.mock.calls.some(([, args]) => 'serverSecret' in args && Object.keys(args).length === 4)).toBe(false)
    expect(mutation).toHaveBeenCalledTimes(1) // only the attempt was recorded, never markPaid
  })

  it('refuses when signed out, for someone elses order, or for a non-pending order', async () => {
    vi.mocked(getConvexAsUser).mockResolvedValueOnce(null)
    expect((await post(captureRoute, { paypalOrderId: 'PP-1', convexOrderId: 'order1' })).status).toBe(401)
    getOwned.mockResolvedValueOnce(null)
    expect((await post(captureRoute, { paypalOrderId: 'PP-1', convexOrderId: 'order1' })).status).toBe(404)
    getOwned.mockResolvedValueOnce({ ...ORDER, status: 'cancelled' })
    expect((await post(captureRoute, { paypalOrderId: 'PP-1', convexOrderId: 'order1' })).status).toBe(409)
    expect(paypalCalls.some((c) => c.url.endsWith('/capture'))).toBe(false)
  })

  it('repeating a completed payment succeeds without charging twice', async () => {
    getOwned.mockResolvedValueOnce({ ...ORDER, status: 'paid', paypalOrderId: 'PP-1' })
    const res = await post(captureRoute, { paypalOrderId: 'PP-1', convexOrderId: 'order1' })
    expect(res.status).toBe(200)
    expect(paypalCalls.some((c) => c.url.endsWith('/capture'))).toBe(false)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('is unavailable (503) without an exchange rate', async () => {
    getOwned.mockResolvedValueOnce({ ...ORDER, exchangeRate: undefined })
    expect((await post(captureRoute, { paypalOrderId: 'PP-1', convexOrderId: 'order1' })).status).toBe(503)
    expect(paypalCalls).toHaveLength(0)
  })
})
