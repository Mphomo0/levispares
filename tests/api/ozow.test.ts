// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getOwned = vi.fn()
const mutation = vi.fn()
const serverQuery = vi.fn()

vi.mock('@/lib/serverConvex', () => ({
  getConvexAsUser: vi.fn(async () => ({ query: getOwned })),
}))
vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    mutation = mutation
    query = serverQuery
  },
}))

process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'
process.env.OZOW_SITE_CODE = 'SITE-1'
process.env.OZOW_PRIVATE_KEY = 'Private-Key'
process.env.OZOW_CLIENT_ID = 'client-id'
process.env.OZOW_CLIENT_SECRET = 'client-secret'
process.env.PAYMENT_SERVER_SECRET = 'server-secret'

const { ozowHash, resetOzowToken } = await import('@/lib/ozow')
const createRoute = await import('@/app/api/ozow/create-payment/route')
const notifyRoute = await import('@/app/api/ozow/notify/route')

const ORDER = { _id: 'order1', status: 'pending', total: 537.49, paymentRequestId: 'pay-1', paymentStartedAt: Date.UTC(2026, 10, 16, 10) }

function post(url: string, body: unknown) {
  return new Request(url, { method: 'POST', body: JSON.stringify(body) }) as never
}

function notification(overrides: Record<string, string> = {}, sign = true) {
  const fields: Record<string, string> = {
    SiteCode: 'SITE-1',
    TransactionId: 'oz-tx-1',
    TransactionReference: 'order1',
    Amount: '537.49',
    Status: 'Complete',
    Optional1: '',
    Optional2: '',
    Optional3: '',
    Optional4: '',
    Optional5: '',
    CurrencyCode: 'ZAR',
    IsTest: 'False',
    StatusMessage: '',
    ...overrides,
  }
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  const hashed = ['SiteCode', 'TransactionId', 'TransactionReference', 'Amount', 'Status', 'Optional1', 'Optional2', 'Optional3', 'Optional4', 'Optional5', 'CurrencyCode', 'IsTest', 'StatusMessage']
    .map((k) => fields[k]).filter((v) => v !== '')
  form.append('Hash', sign ? ozowHash(hashed, 'Private-Key') : 'bad')
  return new Request('http://localhost/api/ozow/notify', { method: 'POST', body: form }) as never
}

type Call = { url: string; init: { method?: string; headers?: Record<string, string>; body?: unknown } }
let calls: Call[]

/** Stands in for One API: the token, creating a payment, and listing its transactions. */
function stubOzow(opts: { transactions?: object[] | 'fail'; payment?: { status: number; body: object } } = {}) {
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL, init: Call['init'] = {}) => {
    const url = String(input)
    calls.push({ url, init })
    const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })
    if (url.endsWith('/token')) return json({ access_token: 'tok', token_type: 'Bearer', expires_in: '14400', scope: 'payments' })
    if (url.endsWith('/payments')) {
      return opts.payment
        ? json(opts.payment.body, opts.payment.status)
        : json({ id: 'pay-1', status: 'Created', redirectUrl: 'https://pay.ozow.com/pay-1/secure' }, 201)
    }
    if (url.includes('/transactions')) {
      if (opts.transactions === 'fail') return json({}, 500)
      return json({ results: opts.transactions ?? [{ id: 'oz-tx-1', status: 'Successful', amount: { currency: 'ZAR', value: 537.49 } }] })
    }
    throw new Error('unexpected fetch ' + url)
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  serverQuery.mockResolvedValue(ORDER)
  getOwned.mockResolvedValue(ORDER)
  resetOzowToken()
  stubOzow()
})

describe('create payment', () => {
  it('gets a token, creates the payment for the stored total, holds the order and returns Ozow\'s redirect', async () => {
    const res = await createRoute.POST(post('http://localhost/api/ozow/create-payment', { convexOrderId: 'order1' }))
    expect(await res.json()).toEqual({ redirectUrl: 'https://pay.ozow.com/pay-1/secure' })

    const token = calls.find((c) => c.url === 'https://one.ozow.com/v1/token')!
    expect(String(token.init.body)).toBe('client_id=client-id&client_secret=client-secret&scope=payments&grant_type=client_credentials')

    const payment = calls.find((c) => c.url === 'https://one.ozow.com/v1/payments')!
    expect(payment.init.headers!.Authorization).toBe('Bearer tok')
    const body = JSON.parse(String(payment.init.body))
    expect(body).toMatchObject({
      siteCode: 'SITE-1',
      region: 'ZA',
      amount: { currency: 'ZAR', value: 537.49 },
      merchantReference: 'order1',
      returnUrl: 'https://www.levispares.co.za/checkout/success?orderId=order1',
      notifyUrl: 'https://www.levispares.co.za/api/ozow/notify',
    })
    expect(body.beneficiaryReference).toMatch(/^[A-Za-z0-9]{1,20}$/)
    expect(Number.isNaN(Date.parse(body.expireAt))).toBe(false)

    // The order is held before the payment exists, then Ozow's id is kept.
    expect(mutation.mock.calls.map((c) => c[1])).toEqual([
      { id: 'order1', serverSecret: 'server-secret' },
      { id: 'order1', paymentRequestId: 'pay-1', serverSecret: 'server-secret' },
    ])
  })

  it('never sends a secret to the browser', async () => {
    const res = await createRoute.POST(post('http://localhost/api/ozow/create-payment', { convexOrderId: 'order1' }))
    const text = JSON.stringify(await res.json())
    for (const secret of ['Private-Key', 'client-secret', 'tok']) expect(text).not.toContain(secret)
  })

  it('reuses the access token until it expires', async () => {
    await createRoute.POST(post('http://localhost/api/ozow/create-payment', { convexOrderId: 'order1' }))
    await createRoute.POST(post('http://localhost/api/ozow/create-payment', { convexOrderId: 'order1' }))
    expect(calls.filter((c) => c.url.endsWith('/token'))).toHaveLength(1)
  })

  it('fails when Ozow rejects the payment request', async () => {
    stubOzow({ payment: { status: 400, body: { code: 'BadRequest', detail: 'amount: Amount must be greater than 0' } } })
    const res = await createRoute.POST(post('http://localhost/api/ozow/create-payment', { convexOrderId: 'order1' }))
    expect(res.status).toBe(500)
  })

  it('refuses an order that is not awaiting payment', async () => {
    getOwned.mockResolvedValue({ ...ORDER, status: 'paid' })
    const res = await createRoute.POST(post('http://localhost/api/ozow/create-payment', { convexOrderId: 'order1' }))
    expect(res.status).toBe(409)
    expect(mutation).not.toHaveBeenCalled()
  })
})

describe('notify', () => {
  it('marks the order paid for a genuine, matching, completed payment', async () => {
    const res = await notifyRoute.POST(notification())
    expect(res.status).toBe(200)
    expect(mutation).toHaveBeenCalledWith(expect.anything(), { id: 'order1', paymentReference: 'oz-tx-1', serverSecret: 'server-secret' })
  })

  it('verifies in the documented field order, whatever order the body arrives in', async () => {
    const form = new FormData()
    const genuine = await notification()
    const original = await (genuine as unknown as Request).formData()
    for (const [k, v] of [...original.entries()].reverse()) form.append(k, v)
    form.append('SubStatus', 'Unclassified')
    const res = await notifyRoute.POST(new Request('http://localhost/api/ozow/notify', { method: 'POST', body: form }) as never)
    expect(res.status).toBe(200)
  })

  it('rejects a notification with a bad hash', async () => {
    const res = await notifyRoute.POST(notification({}, false))
    expect(res.status).toBe(400)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('rejects a mismatched amount, flags the order for staff and does not mark it paid', async () => {
    const res = await notifyRoute.POST(notification({ Amount: '1.00' }))
    expect(res.status).toBe(400)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(mutation.mock.calls[0][1]).toMatchObject({ id: 'order1', note: expect.stringContaining('does not match') })
  })

  it.each(['Cancelled', 'Error', 'Abandoned'])('releases the held stock when a payment is %s', async (Status) => {
    const res = await notifyRoute.POST(notification({ Status }))
    expect(res.status).toBe(200)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(mutation.mock.calls[0][1]).toEqual({ id: 'order1', serverSecret: 'server-secret' })
  })

  it('flags the order when the bank could not confirm the payment', async () => {
    const res = await notifyRoute.POST(notification({ Status: 'PendingInvestigation' }))
    expect(res.status).toBe(200)
    expect(mutation.mock.calls[0][1]).toMatchObject({ note: expect.stringContaining('could not confirm') })
  })

  it('leaves the order alone while a payment is still Pending', async () => {
    const res = await notifyRoute.POST(notification({ Status: 'Pending' }))
    expect(res.status).toBe(200)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('does not mark paid when Ozow\'s own record says the transaction did not succeed', async () => {
    stubOzow({ transactions: [{ id: 'oz-tx-1', status: 'Error', amount: { currency: 'ZAR', value: 537.49 } }] })
    const res = await notifyRoute.POST(notification())
    expect(res.status).toBe(400)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('still marks paid on the verified notification when the lookup cannot be done', async () => {
    stubOzow({ transactions: 'fail' })
    const res = await notifyRoute.POST(notification())
    expect(res.status).toBe(200)
    expect(mutation).toHaveBeenCalledWith(expect.anything(), { id: 'order1', paymentReference: 'oz-tx-1', serverSecret: 'server-secret' })
  })

  it('looks the payment up by Ozow\'s payment id over whole days around when it started', async () => {
    await notifyRoute.POST(notification())
    const lookup = new URL(calls.find((c) => c.url.includes('/transactions'))!.url)
    expect(lookup.origin + lookup.pathname).toBe('https://one.ozow.com/v1/payments/pay-1/transactions')
    expect(lookup.searchParams.get('fromDate')).toBe('2026-11-15')
    expect(lookup.searchParams.get('toDate')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not count a test payment unless tests are allowed', async () => {
    const res = await notifyRoute.POST(notification({ IsTest: 'True' }))
    expect(res.status).toBe(400)
    expect(mutation.mock.calls[0][1]).toMatchObject({ note: expect.stringContaining('test payment') })
  })

  it('accepts a repeated notification for an already paid order', async () => {
    serverQuery.mockResolvedValue({ ...ORDER, status: 'paid', paymentReference: 'oz-tx-1' })
    const res = await notifyRoute.POST(notification())
    expect(res.status).toBe(200)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('flags money that arrives for a cancelled order', async () => {
    serverQuery.mockResolvedValue({ ...ORDER, status: 'cancelled' })
    const res = await notifyRoute.POST(notification())
    expect(res.status).toBe(200)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(mutation.mock.calls[0][1]).toMatchObject({ note: expect.stringContaining('after this order was cancelled') })
  })
})

describe('notify without a private key (Ozow staging)', () => {
  beforeEach(() => { delete process.env.OZOW_PRIVATE_KEY })
  afterEach(() => { process.env.OZOW_PRIVATE_KEY = 'Private-Key' })

  it('marks paid when Ozow\'s own record shows the transaction succeeded', async () => {
    const res = await notifyRoute.POST(notification({}, false))
    expect(res.status).toBe(200)
    expect(mutation).toHaveBeenCalledWith(expect.anything(), { id: 'order1', paymentReference: 'oz-tx-1', serverSecret: 'server-secret' })
  })

  it('does nothing when Ozow does not list the transaction, so Ozow retries', async () => {
    stubOzow({ transactions: [] })
    const res = await notifyRoute.POST(notification({}, false))
    expect(res.status).toBe(503)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('does nothing when the lookup cannot be done', async () => {
    stubOzow({ transactions: 'fail' })
    const res = await notifyRoute.POST(notification({}, false))
    expect(res.status).toBe(503)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('refuses when Ozow\'s record says the transaction did not succeed', async () => {
    stubOzow({ transactions: [{ id: 'oz-tx-1', status: 'Error', amount: { currency: 'ZAR', value: 537.49 } }] })
    const res = await notifyRoute.POST(notification({}, false))
    expect(res.status).toBe(400)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('checks the amount on Ozow\'s record, not just the notification', async () => {
    stubOzow({ transactions: [{ id: 'oz-tx-1', status: 'Successful', amount: { currency: 'ZAR', value: 1 } }] })
    const res = await notifyRoute.POST(notification({}, false))
    expect(res.status).toBe(400)
    expect(mutation.mock.calls[0][1]).toMatchObject({ note: expect.stringContaining('does not match') })
  })

  it.each(['Cancelled', 'Error', 'Abandoned', 'PendingInvestigation'])('ignores an unproven %s notification', async (Status) => {
    const res = await notifyRoute.POST(notification({ Status }, false))
    expect(res.status).toBe(200)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('does not flag an unproven second payment on a paid order', async () => {
    serverQuery.mockResolvedValue({ ...ORDER, status: 'paid', paymentReference: 'oz-tx-0' })
    const res = await notifyRoute.POST(notification({}, false))
    expect(res.status).toBe(200)
    expect(mutation).not.toHaveBeenCalled()
  })

  it('still checks the site code', async () => {
    const res = await notifyRoute.POST(notification({ SiteCode: 'OTHER' }, false))
    expect(res.status).toBe(400)
    expect(mutation).not.toHaveBeenCalled()
  })
})
