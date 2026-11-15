// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
process.env.OZOW_API_KEY = 'api-key'
process.env.OZOW_IS_TEST = 'true'
process.env.PAYMENT_SERVER_SECRET = 'server-secret'

const { ozowHash } = await import('@/lib/ozow')
const createRoute = await import('@/app/api/ozow/create-payment/route')
const notifyRoute = await import('@/app/api/ozow/notify/route')

const ORDER = { _id: 'order1', status: 'pending', total: 537.49 }

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
    IsTest: 'True',
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

function stubLookup(tx: object | null = { id: 'oz-tx-1', transactionReference: 'order1', amount: 537.49, status: 'Complete' }) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => (tx ? [tx] : []) })))
}

beforeEach(() => {
  vi.clearAllMocks()
  serverQuery.mockResolvedValue(ORDER)
  getOwned.mockResolvedValue(ORDER)
  stubLookup()
})

describe('create payment', () => {
  it('returns the SDK payment url and signed post data for the stored order total, and locks the order', async () => {
    const res = await createRoute.POST(post('http://localhost/api/ozow/create-payment', { convexOrderId: 'order1' }))
    const { paymentUrl, postData } = await res.json()
    expect(paymentUrl).toBe('https://pay.ozow.com/')
    expect(postData).toMatchObject({
      SiteCode: 'SITE-1', CountryCode: 'ZA', CurrencyCode: 'ZAR', Amount: '537.49',
      TransactionReference: 'order1', IsTest: 'true',
      NotifyUrl: 'https://www.levispares.co.za/api/ozow/notify',
    })
    expect(postData.BankReference.length).toBeLessThanOrEqual(20)
    const { HashCheck, ...signed } = postData
    const order = ['SiteCode', 'CountryCode', 'CurrencyCode', 'Amount', 'TransactionReference', 'BankReference', 'CancelUrl', 'ErrorUrl', 'SuccessUrl', 'NotifyUrl', 'IsTest']
    expect(HashCheck).toBe(ozowHash(order.map((k) => signed[k]), 'Private-Key'))
    expect(mutation).toHaveBeenCalledWith(expect.anything(), { id: 'order1', serverSecret: 'server-secret' })
  })

  it('never sends the private key to the browser', async () => {
    const res = await createRoute.POST(post('http://localhost/api/ozow/create-payment', { convexOrderId: 'order1' }))
    expect(JSON.stringify(await res.json())).not.toContain('Private-Key')
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

  it('does not mark paid when Ozow itself does not report it complete', async () => {
    stubLookup({ id: 'x', transactionReference: 'order1', amount: 537.49, status: 'Pending' })
    const res = await notifyRoute.POST(notification())
    expect(res.status).toBe(400)
    expect(mutation).not.toHaveBeenCalled()
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
